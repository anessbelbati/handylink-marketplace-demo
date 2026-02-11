import Stripe from "stripe";
import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
    }

    const sig = request.headers.get("stripe-signature");
    if (!sig) return new Response("Missing stripe-signature", { status: 400 });

    const payload = Buffer.from(await request.arrayBuffer());

    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      return new Response(err?.message ?? "Invalid signature", { status: 400 });
    }

    if (event.type === "account.updated") {
      const acct = event.data.object as Stripe.Account;
      await ctx.runMutation(internal.stripe_db.updateConnectStatusByAccountId, {
        stripeConnectAccountId: acct.id,
        stripeChargesEnabled: !!acct.charges_enabled,
        stripePayoutsEnabled: !!acct.payouts_enabled,
        stripeDetailsSubmitted: !!acct.details_submitted,
        stripeOnboardedAt: acct.details_submitted ? Date.now() : undefined,
      });
      return new Response("ok", { status: 200 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        return new Response("ok", { status: 200 });
      }

      const requestId = session.metadata?.requestId;
      const quoteId = session.metadata?.quoteId;
      if (requestId && quoteId) {
        await ctx.runMutation(internal.stripe_db.finalizePaidRequest, {
          requestId: requestId as any,
          quoteId: quoteId as any,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : undefined,
          amountTotal: session.amount_total ?? undefined,
          currency: session.currency ?? undefined,
        });
      }
      return new Response("ok", { status: 200 });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = session.metadata?.requestId;
      if (requestId) {
        // Best-effort cleanup so users can retry checkout.
        await ctx.runMutation(internal.stripe_db.resetCheckoutForRequest, {
          requestId: requestId as any,
        });
      }
      return new Response("ok", { status: 200 });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
