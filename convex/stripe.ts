import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { action, query } from "./_generated/server";

import { requireUser } from "./lib/auth";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function getOrigin(raw: string) {
  try {
    return new URL(raw).origin;
  } catch {
    throw new ConvexError("Invalid origin");
  }
}

function platformFeeBps() {
  const raw = process.env.STRIPE_PLATFORM_FEE_BPS;
  const n = raw ? Number(raw) : 1000; // default 10%
  if (!Number.isFinite(n) || n < 0 || n > 10_000) return 1000;
  return Math.round(n);
}

function dollarsToCents(amount: number) {
  // Accepts integers or decimals; always round to the nearest cent.
  return Math.round(amount * 100);
}

export const getMyConnectStatus = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    return {
      connectAccountId: me.stripeConnectAccountId ?? null,
      chargesEnabled: !!me.stripeChargesEnabled,
      payoutsEnabled: !!me.stripePayoutsEnabled,
      detailsSubmitted: !!me.stripeDetailsSubmitted,
      onboardedAt: me.stripeOnboardedAt ?? null,
    };
  },
});

export const createConnectOnboardingLink = action({
  args: { demoClerkId: v.optional(v.string()), origin: v.string() },
  handler: async (ctx, args) => {
    const { api } = (await import("./_generated/api")) as any;
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Only providers can connect payouts");
    }

    const origin = getOrigin(args.origin);
    const stripe = stripeClient();

    let accountId = me.stripeConnectAccountId ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: me.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { clerkId: me.clerkId, convexUserId: String(me._id) },
      });
      accountId = account.id;

      await ctx.runMutation(api.stripe_db.saveConnectAccountId, {
        demoClerkId: args.demoClerkId,
        stripeConnectAccountId: accountId,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/profile?stripe=refresh`,
      return_url: `${origin}/dashboard/profile?stripe=return`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  },
});

export const syncMyConnectAccount = action({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { api } = (await import("./_generated/api")) as any;
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");
    const accountId = me.stripeConnectAccountId;
    if (!accountId) throw new ConvexError("Stripe account not connected");

    const stripe = stripeClient();
    const acct = await stripe.accounts.retrieve(accountId);
    if (acct.deleted) throw new ConvexError("Stripe account not found");

    await ctx.runMutation(api.stripe_db.saveMyConnectStatus, {
      demoClerkId: args.demoClerkId,
      stripeChargesEnabled: !!acct.charges_enabled,
      stripePayoutsEnabled: !!acct.payouts_enabled,
      stripeDetailsSubmitted: !!acct.details_submitted,
    });

    return {
      connectAccountId: accountId,
      chargesEnabled: !!acct.charges_enabled,
      payoutsEnabled: !!acct.payouts_enabled,
      detailsSubmitted: !!acct.details_submitted,
    };
  },
});

export const createCheckoutForQuote = action({
  args: {
    demoClerkId: v.optional(v.string()),
    origin: v.string(),
    requestId: v.id("serviceRequests"),
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const { api } = (await import("./_generated/api")) as any;
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");

    const data = await ctx.runQuery(api.requests.getRequest, {
      demoClerkId: args.demoClerkId,
      requestId: args.requestId,
    });
    if (!data) throw new ConvexError("Request not found");

    const req = data.request;
    if (!me.isAdmin && me._id !== req.clientId) {
      throw new ConvexError("Forbidden");
    }

    const paymentStatus = req.paymentStatus ?? "unpaid";
    if (paymentStatus === "paid") {
      throw new ConvexError("Request is already paid");
    }
    if (paymentStatus === "processing") {
      throw new ConvexError("Payment is already in progress");
    }
    if (req.status === "cancelled" || req.status === "completed") {
      throw new ConvexError("Request is closed");
    }

    const row = data.quotes.find((q: any) => q.quote._id === args.quoteId);
    if (!row) throw new ConvexError("Quote not found");
    if (row.quote.status !== "pending") {
      throw new ConvexError("Quote is not available");
    }
    if (!row.provider) throw new ConvexError("Provider not found");
    if (row.provider.isSuspended) throw new ConvexError("Provider is suspended");

    const destinationAccount = row.provider.stripeConnectAccountId;
    if (!destinationAccount) {
      throw new ConvexError("Provider is not set up for payments yet");
    }

    const amountCents = dollarsToCents(row.quote.amount);
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      throw new ConvexError("Invalid quote amount");
    }

    const fee = Math.round((amountCents * platformFeeBps()) / 10_000);
    const providerPayout = Math.max(amountCents - fee, 0);

    const origin = getOrigin(args.origin);
    const stripe = stripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: me.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: req.title,
              description: `HandyLink service request (${req.city})`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: destinationAccount },
        metadata: {
          requestId: String(req._id),
          quoteId: String(row.quote._id),
          clientUserId: String(req.clientId),
          providerUserId: String(row.quote.providerId),
        },
      },
      metadata: {
        requestId: String(req._id),
        quoteId: String(row.quote._id),
      },
      success_url: `${origin}/dashboard/requests/${req._id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/requests/${req._id}?payment=cancel`,
    });

    if (!session.url) throw new ConvexError("Stripe did not return a checkout URL");

    await ctx.runMutation(api.stripe_db.markRequestProcessing, {
      demoClerkId: args.demoClerkId,
      requestId: req._id,
      quoteId: row.quote._id,
      stripeCheckoutSessionId: session.id,
      platformFeeCents: fee,
      providerPayoutCents: providerPayout,
    });

    return { url: session.url };
  },
});

export const syncCheckoutSession = action({
  args: { demoClerkId: v.optional(v.string()), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { api } = (await import("./_generated/api")) as any;
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(args.sessionId);

    const requestId = session.metadata?.requestId;
    const quoteId = session.metadata?.quoteId;
    if (!requestId || !quoteId) {
      throw new ConvexError("Missing checkout metadata");
    }

    const data = await ctx.runQuery(api.requests.getRequest, {
      demoClerkId: args.demoClerkId,
      requestId: requestId as any,
    });
    if (!data) throw new ConvexError("Request not found");
    if (!me.isAdmin && me._id !== data.request.clientId) {
      throw new ConvexError("Forbidden");
    }

    if (session.payment_status !== "paid") {
      return { ok: false, paymentStatus: session.payment_status };
    }

    await ctx.runMutation(api.stripe_db.confirmPaidRequest, {
      demoClerkId: args.demoClerkId,
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

    return { ok: true };
  },
});
