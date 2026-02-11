import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

import { requireUser } from "./lib/auth";

function dollarsToCents(amount: number) {
  // Accepts integers or decimals; always round to the nearest cent.
  return Math.round(amount * 100);
}

type FinalizeArgs = {
  requestId: Id<"serviceRequests">;
  quoteId: Id<"quotes">;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
};

async function finalizePaidRequestImpl(ctx: MutationCtx, args: FinalizeArgs) {
  const req = await ctx.db.get(args.requestId);
  if (!req) throw new ConvexError("Request not found");
  const quote = await ctx.db.get(args.quoteId);
  if (!quote) throw new ConvexError("Quote not found");
  if (quote.requestId !== req._id) throw new ConvexError("Quote does not match request");

  if ((req.paymentStatus ?? "unpaid") === "paid") return true;

  if (
    req.stripeCheckoutSessionId &&
    req.stripeCheckoutSessionId !== args.stripeCheckoutSessionId
  ) {
    // Ignore webhooks for stale sessions.
    return true;
  }

  if (args.amountTotal !== undefined) {
    const expected = dollarsToCents(quote.amount);
    if (Math.abs(expected - args.amountTotal) > 2) {
      throw new ConvexError("Amount mismatch");
    }
  }
  if (args.currency && args.currency.toLowerCase() !== "usd") {
    throw new ConvexError("Unsupported currency");
  }

  const now = Date.now();

  // Accept this quote, decline others.
  const all = await ctx.db
    .query("quotes")
    .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
    .collect();
  for (const q of all) {
    await ctx.db.patch(q._id, {
      status: q._id === quote._id ? "accepted" : "declined",
    });
  }

  await ctx.db.patch(req._id, {
    status: "accepted",
    acceptedQuoteId: quote._id,
    paymentStatus: "paid",
    paymentQuoteId: undefined,
    stripeCheckoutSessionId: args.stripeCheckoutSessionId,
    stripePaymentIntentId: args.stripePaymentIntentId,
    paidAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("notifications", {
    userId: quote.providerId,
    type: "request_update",
    title: "Payment received",
    body: `You've been hired for \"${req.title}\". The client completed payment.`,
    data: { requestId: req._id, quoteId: quote._id },
    isRead: false,
    createdAt: now,
  });

  return true;
}

export const saveConnectAccountId = mutation({
  args: { demoClerkId: v.optional(v.string()), stripeConnectAccountId: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) throw new ConvexError("Forbidden");

    await ctx.db.patch(me._id, {
      stripeConnectAccountId: args.stripeConnectAccountId,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeDetailsSubmitted: false,
      stripeOnboardedAt: undefined,
    });
    return true;
  },
});

export const saveMyConnectStatus = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    stripeChargesEnabled: v.boolean(),
    stripePayoutsEnabled: v.boolean(),
    stripeDetailsSubmitted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) throw new ConvexError("Forbidden");
    if (!me.stripeConnectAccountId) throw new ConvexError("Stripe account not connected");

    await ctx.db.patch(me._id, {
      stripeChargesEnabled: args.stripeChargesEnabled,
      stripePayoutsEnabled: args.stripePayoutsEnabled,
      stripeDetailsSubmitted: args.stripeDetailsSubmitted,
      stripeOnboardedAt: args.stripeDetailsSubmitted ? Date.now() : undefined,
    });
    return true;
  },
});

export const markRequestProcessing = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    requestId: v.id("serviceRequests"),
    quoteId: v.id("quotes"),
    stripeCheckoutSessionId: v.string(),
    platformFeeCents: v.number(),
    providerPayoutCents: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");
    if (!me.isAdmin && me._id !== req.clientId) throw new ConvexError("Forbidden");
    if ((req.paymentStatus ?? "unpaid") !== "unpaid") {
      throw new ConvexError("Payment already started");
    }

    await ctx.db.patch(req._id, {
      paymentStatus: "processing",
      paymentQuoteId: args.quoteId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      platformFeeCents: args.platformFeeCents,
      providerPayoutCents: args.providerPayoutCents,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const confirmPaidRequest = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    requestId: v.id("serviceRequests"),
    quoteId: v.id("quotes"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    amountTotal: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");
    if (!me.isAdmin && me._id !== req.clientId) throw new ConvexError("Forbidden");

    return await finalizePaidRequestImpl(ctx, {
      requestId: args.requestId,
      quoteId: args.quoteId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amountTotal: args.amountTotal,
      currency: args.currency,
    });
  },
});

export const cancelCheckoutForRequest = mutation({
  args: { demoClerkId: v.optional(v.string()), requestId: v.id("serviceRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Not found");
    if (!me.isAdmin && me._id !== req.clientId) throw new ConvexError("Forbidden");

    if ((req.paymentStatus ?? "unpaid") !== "processing") return true;

    await ctx.db.patch(req._id, {
      paymentStatus: "unpaid",
      paymentQuoteId: undefined,
      stripeCheckoutSessionId: undefined,
      stripePaymentIntentId: undefined,
      platformFeeCents: undefined,
      providerPayoutCents: undefined,
      paidAt: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const updateConnectStatusByAccountId = internalMutation({
  args: {
    stripeConnectAccountId: v.string(),
    stripeChargesEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
    stripeDetailsSubmitted: v.optional(v.boolean()),
    stripeOnboardedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripeConnectAccountId", (q) =>
        q.eq("stripeConnectAccountId", args.stripeConnectAccountId),
      )
      .unique();
    if (!user) return null;

    await ctx.db.patch(user._id, {
      stripeChargesEnabled: args.stripeChargesEnabled ?? user.stripeChargesEnabled,
      stripePayoutsEnabled: args.stripePayoutsEnabled ?? user.stripePayoutsEnabled,
      stripeDetailsSubmitted: args.stripeDetailsSubmitted ?? user.stripeDetailsSubmitted,
      stripeOnboardedAt: args.stripeOnboardedAt ?? user.stripeOnboardedAt,
    });
    return true;
  },
});

export const finalizePaidRequest = internalMutation({
  args: {
    requestId: v.id("serviceRequests"),
    quoteId: v.id("quotes"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    amountTotal: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await finalizePaidRequestImpl(ctx, {
      requestId: args.requestId,
      quoteId: args.quoteId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      amountTotal: args.amountTotal,
      currency: args.currency,
    });
  },
});

export const resetCheckoutForRequest = internalMutation({
  args: { requestId: v.id("serviceRequests") },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req) return true;
    if ((req.paymentStatus ?? "unpaid") !== "processing") return true;

    await ctx.db.patch(req._id, {
      paymentStatus: "unpaid",
      paymentQuoteId: undefined,
      stripeCheckoutSessionId: undefined,
      stripePaymentIntentId: undefined,
      platformFeeCents: undefined,
      providerPayoutCents: undefined,
      paidAt: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

