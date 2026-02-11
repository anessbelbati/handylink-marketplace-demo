import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireUser } from "./lib/auth";

export const submitQuote = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    requestId: v.id("serviceRequests"),
    amount: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Only providers can submit quotes");
    }

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");
    if (req.status === "cancelled" || req.status === "completed") {
      throw new ConvexError("Request is closed");
    }

    const existing = await ctx.db
      .query("quotes")
      .withIndex("by_providerId", (q) => q.eq("providerId", me._id))
      .filter((q) => q.eq(q.field("requestId"), req._id))
      .unique();
    if (existing) throw new ConvexError("You already quoted this request");

    const now = Date.now();
    const quoteId = await ctx.db.insert("quotes", {
      requestId: req._id,
      providerId: me._id,
      amount: args.amount,
      message: args.message,
      status: "pending",
      createdAt: now,
    });

    if (req.status === "open") {
      await ctx.db.patch(req._id, { status: "in_discussion", updatedAt: now });
    } else {
      await ctx.db.patch(req._id, { updatedAt: now });
    }

    await ctx.db.insert("notifications", {
      userId: req.clientId,
      type: "new_quote",
      title: "New quote received",
      body: `${me.fullName} sent a quote for "${req.title}".`,
      data: { requestId: req._id, quoteId },
      isRead: false,
      createdAt: now,
    });

    return quoteId;
  },
});

export const respondToQuote = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    quoteId: v.id("quotes"),
    status: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new ConvexError("Quote not found");

    const req = await ctx.db.get(quote.requestId);
    if (!req) throw new ConvexError("Request not found");

    if (!me.isAdmin && me._id !== req.clientId) {
      throw new ConvexError("Forbidden");
    }

    const now = Date.now();

    if (args.status === "accepted") {
      // Clients must pay via Stripe Checkout before a quote is accepted.
      // (Acceptance happens in an internal Stripe webhook mutation.)
      if (!me.isAdmin) {
        throw new ConvexError("Use checkout to accept a quote");
      }
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
        updatedAt: now,
      });

      await ctx.db.insert("notifications", {
        userId: quote.providerId,
        type: "request_update",
        title: "Quote accepted",
        body: `Your quote for "${req.title}" was accepted.`,
        data: { requestId: req._id, quoteId: quote._id },
        isRead: false,
        createdAt: now,
      });

      return true;
    }

    await ctx.db.patch(quote._id, { status: "declined" });
    await ctx.db.patch(req._id, { updatedAt: now });
    await ctx.db.insert("notifications", {
      userId: quote.providerId,
      type: "request_update",
      title: "Quote declined",
      body: `Your quote for "${req.title}" was declined.`,
      data: { requestId: req._id, quoteId: quote._id },
      isRead: false,
      createdAt: now,
    });
    return true;
  },
});

export const getMyQuotes = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Forbidden");
    }

    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_providerId", (q) => q.eq("providerId", me._id))
      .order("desc")
      .take(200);

    const out = [];
    for (const quote of quotes) {
      const request = await ctx.db.get(quote.requestId);
      out.push({ quote, request });
    }
    return out;
  },
});
