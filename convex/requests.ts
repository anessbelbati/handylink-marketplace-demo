import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";

import { requireUser } from "./lib/auth";

export const createRequest = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    categorySlug: v.string(),
    title: v.string(),
    description: v.string(),
    images: v.array(v.id("_storage")),
    lat: v.number(),
    lng: v.number(),
    address: v.string(),
    city: v.string(),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("urgent")),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "client" && !me.isAdmin) {
      throw new ConvexError("Only clients can create service requests");
    }

    const now = Date.now();
    const id = await ctx.db.insert("serviceRequests", {
      clientId: me._id,
      categorySlug: args.categorySlug,
      title: args.title,
      description: args.description,
      images: args.images,
      lat: args.lat,
      lng: args.lng,
      address: args.address,
      city: args.city,
      urgency: args.urgency,
      status: "open",
      budgetMin: args.budgetMin,
      budgetMax: args.budgetMax,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const getRequests = query({
  args: { demoClerkId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);

    if (me.role === "client") {
      const rows = await ctx.db
        .query("serviceRequests")
        .withIndex("by_clientId", (q) => q.eq("clientId", me._id))
        .order("desc")
        .collect();

      return args.status ? rows.filter((r) => r.status === args.status) : rows;
    }

    if (me.role === "provider") {
      const profile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", me._id))
        .unique();
      if (!profile) return [];

      const areas = Array.from(
        new Set([profile.city, ...(profile.serviceAreas ?? [])]),
      )
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);

      // Collect requests in each service area. For demo scale this is plenty fast.
      const byId = new Map<string, any>();
      for (const area of areas) {
        const cityRows = await ctx.db
          .query("serviceRequests")
          .withIndex("by_city", (q) => q.eq("city", area))
          .collect();
        for (const r of cityRows) byId.set(String(r._id), r);
      }

      const rows = Array.from(byId.values());

      return rows
        .filter((r) => r.status === "open")
        .filter((r) => profile.categories.includes(r.categorySlug))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 100);
    }

    // Admin: all
    const all = await ctx.db.query("serviceRequests").collect();
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200);
  },
});

export const getRequest = query({
  args: { demoClerkId: v.optional(v.string()), requestId: v.id("serviceRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const req = await ctx.db.get(args.requestId);
    if (!req) return null;

    // Authorization
    let allowed = me.isAdmin || me._id === req.clientId;
    if (!allowed && me.role === "provider") {
      const profile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", me._id))
        .unique();
      if (profile) {
        const areas = new Set<string>(
          [profile.city, ...(profile.serviceAreas ?? [])]
            .map((s) => s.trim())
            .filter(Boolean),
        );
        if (areas.has(req.city)) {
          allowed = profile.categories.includes(req.categorySlug);
        }
      }
      // Providers who already quoted can always view.
      const existingQuote = await ctx.db
        .query("quotes")
        .withIndex("by_providerId", (q) => q.eq("providerId", me._id))
        .filter((q) => q.eq(q.field("requestId"), req._id))
        .unique();
      if (existingQuote) allowed = true;
    }

    if (!allowed) throw new ConvexError("Forbidden");

    const client = await ctx.db.get(req.clientId);

    let quotesQuery = ctx.db
      .query("quotes")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .order("desc");

    const quotes =
      me.isAdmin || me._id === req.clientId
        ? await quotesQuery.collect()
        : await quotesQuery
            .filter((q) => q.eq(q.field("providerId"), me._id))
            .collect();

    const enriched = [];
    for (const quote of quotes) {
      const provider = await ctx.db.get(quote.providerId);
      const providerProfile = await ctx.db
        .query("providerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", quote.providerId))
        .unique();
      enriched.push({ quote, provider, providerProfile });
    }

    let review = await ctx.db
      .query("reviews")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .unique();

    // Only the client, the reviewed provider, or an admin can see the review.
    if (review && !me.isAdmin && me._id !== req.clientId && me._id !== review.providerId) {
      review = null;
    }

    return { request: req, client, quotes: enriched, review };
  },
});

export const updateRequestStatus = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    requestId: v.id("serviceRequests"),
    status: v.union(
      v.literal("open"),
      v.literal("in_discussion"),
      v.literal("accepted"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Not found");

    if (!me.isAdmin && me._id !== req.clientId) {
      throw new ConvexError("Forbidden");
    }

    const prevStatus = req.status;
    const nextStatus = args.status;

    if (!me.isAdmin) {
      // Clients can only cancel or complete their own requests.
      if (nextStatus !== "cancelled" && nextStatus !== "completed") {
        throw new ConvexError("Invalid status update");
      }

      if (nextStatus === "cancelled") {
        if (prevStatus === "completed") {
          throw new ConvexError("Completed requests cannot be cancelled");
        }
      }

      if (nextStatus === "completed") {
        if (prevStatus !== "accepted") {
          throw new ConvexError("Only accepted requests can be completed");
        }
        if (!req.acceptedQuoteId) {
          throw new ConvexError("Missing accepted quote");
        }
      }
    }

    const now = Date.now();
    await ctx.db.patch(req._id, { status: nextStatus, updatedAt: now });

    // Notify relevant users.
    const recipients = new Set<Id<"users">>();

    // If an admin changed the request, notify the client (unless the admin is the client).
    if (me.isAdmin && me._id !== req.clientId) {
      recipients.add(req.clientId);
    }

    if (nextStatus === "cancelled") {
      const qs = await ctx.db
        .query("quotes")
        .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
        .collect();
      for (const q of qs) recipients.add(q.providerId);
    }

    if (nextStatus === "completed" || nextStatus === "accepted") {
      if (req.acceptedQuoteId) {
        const accepted = await ctx.db.get(req.acceptedQuoteId);
        if (accepted) recipients.add(accepted.providerId);
      }
    }

    if (recipients.size > 0 && prevStatus !== nextStatus) {
      const title =
        nextStatus === "cancelled"
          ? "Request cancelled"
          : nextStatus === "completed"
            ? "Request completed"
            : nextStatus === "accepted"
              ? "Request accepted"
              : "Request updated";

      const body =
        nextStatus === "cancelled"
          ? `The request "${req.title}" was cancelled.`
          : nextStatus === "completed"
            ? `The request "${req.title}" was marked completed.`
            : nextStatus === "accepted"
              ? `The request "${req.title}" was accepted.`
              : `The request "${req.title}" was updated.`;

      for (const uid of recipients) {
        if (uid === me._id) continue;
        await ctx.db.insert("notifications", {
          userId: uid,
          type: "request_update",
          title,
          body,
          data: { requestId: req._id, status: nextStatus },
          isRead: false,
          createdAt: now,
        });
      }
    }

    return true;
  },
});
