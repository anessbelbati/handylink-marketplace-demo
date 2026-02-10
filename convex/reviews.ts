import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireUser } from "./lib/auth";

export const getProviderReviews = query({
  args: { providerId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .order("desc")
      .take(50);

    const enriched = [];
    for (const r of rows) {
      const client = await ctx.db.get(r.clientId);
      enriched.push({ review: r, client });
    }
    return enriched;
  },
});

export const getMyReviews = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Forbidden");
    }
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", me._id))
      .order("desc")
      .take(100);

    const enriched = [];
    for (const r of rows) {
      const client = await ctx.db.get(r.clientId);
      const request = await ctx.db.get(r.requestId);
      enriched.push({ review: r, client, request });
    }
    return enriched;
  },
});

export const createReview = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    requestId: v.id("serviceRequests"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "client" && !me.isAdmin) {
      throw new ConvexError("Only clients can create reviews");
    }

    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Rating must be between 1 and 5");
    }

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Request not found");
    if (!me.isAdmin && req.clientId !== me._id) {
      throw new ConvexError("Forbidden");
    }
    if (req.status !== "completed") {
      throw new ConvexError("You can only review after completion");
    }
    if (!req.acceptedQuoteId) {
      throw new ConvexError("Missing accepted quote");
    }

    const acceptedQuote = await ctx.db.get(req.acceptedQuoteId);
    if (!acceptedQuote) throw new ConvexError("Accepted quote not found");
    if (acceptedQuote.requestId !== req._id) {
      throw new ConvexError("Invalid accepted quote");
    }
    if (acceptedQuote.status !== "accepted") {
      throw new ConvexError("Request does not have an accepted provider");
    }

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .unique();
    if (existing) throw new ConvexError("Review already exists");

    const now = Date.now();
    const reviewId = await ctx.db.insert("reviews", {
      requestId: req._id,
      clientId: req.clientId,
      providerId: acceptedQuote.providerId,
      rating: args.rating,
      comment: args.comment,
      createdAt: now,
    });

    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", acceptedQuote.providerId))
      .unique();
    if (profile) {
      const newCount = profile.reviewCount + 1;
      const newAvg =
        (profile.avgRating * profile.reviewCount + args.rating) / newCount;
      await ctx.db.patch(profile._id, {
        reviewCount: newCount,
        avgRating: Math.round(newAvg * 10) / 10,
        updatedAt: now,
      });
    }

    await ctx.db.insert("notifications", {
      userId: acceptedQuote.providerId,
      type: "new_review",
      title: "New review",
      body: `You received a ${args.rating}-star review.`,
      data: { requestId: req._id, reviewId },
      isRead: false,
      createdAt: now,
    });

    return reviewId;
  },
});
