import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// Polar uses Standard Webhooks for signatures. We rely on their SDK validator.
import { validateEvent } from "@polar-sh/sdk/webhooks";

const http = httpRouter();

http.route({
  path: "/polar/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Missing POLAR_WEBHOOK_SECRET", { status: 500 });
    }

    const payload = Buffer.from(await request.arrayBuffer());
    const headers = Object.fromEntries(request.headers.entries());

    let event: any;
    try {
      event = validateEvent(payload, headers, secret);
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    // We use customer.state_changed since it includes a complete "current state"
    // (active subscriptions + benefits) and is easy to make idempotent.
    if (event?.type === "customer.state_changed") {
      const proProductId = process.env.POLAR_PRO_PRODUCT_ID;
      if (proProductId) {
        const externalId = event?.data?.external_id;
        const polarCustomerId = event?.data?.id;
        const subs = Array.isArray(event?.data?.active_subscriptions)
          ? event.data.active_subscriptions
          : [];
        const hasPro = subs.some((s: any) => s?.product_id === proProductId);

        if (typeof externalId === "string" && externalId.length > 0) {
          await ctx.runMutation(internal.billing.applyCustomerStateFromPolar, {
            externalCustomerId: externalId,
            polarCustomerId: typeof polarCustomerId === "string" ? polarCustomerId : undefined,
            hasPro,
          });
        }
      }
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;

