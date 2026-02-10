import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireAdmin, requireUser } from "./lib/auth";

export const claimAdmin = mutation({
  args: { demoClerkId: v.optional(v.string()), secret: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const expected = process.env.ADMIN_CLAIM_SECRET;
    if (!expected) throw new ConvexError("ADMIN_CLAIM_SECRET not set");
    if (args.secret !== expected) throw new ConvexError("Forbidden");

    await ctx.db.patch(me._id, { isAdmin: true, role: "admin" });
    return true;
  },
});

export const getAdminStats = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const users = await ctx.db.query("users").collect();
    const requests = await ctx.db.query("serviceRequests").collect();
    const conversations = await ctx.db.query("conversations").collect();

    const totalUsers = users.length;
    const totalRequests = requests.length;
    const activeConversations = conversations.length;

    const completed = requests.filter((r) => r.status === "completed").length;
    const completionRate = totalRequests === 0 ? 0 : completed / totalRequests;

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const requestsToday = requests.filter((r) => dateKey(r.createdAt) === todayKey).length;

    const signupsByDay = groupByDay(users.map((u) => u.createdAt), 14);
    const requestsByDay = groupByDay(requests.map((r) => r.createdAt), 14);

    const requestsByCategory: Record<string, number> = {};
    for (const r of requests) {
      requestsByCategory[r.categorySlug] = (requestsByCategory[r.categorySlug] ?? 0) + 1;
    }

    return {
      totalUsers,
      totalRequests,
      requestsToday,
      activeConversations,
      completionRate,
      signupsByDay,
      requestsByDay,
      requestsByCategory,
    };
  },
});

export const getAllUsers = query({
  args: {
    demoClerkId: v.optional(v.string()),
    role: v.optional(v.union(v.literal("client"), v.literal("provider"), v.literal("admin"))),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const limit = Math.min(args.limit ?? 100, 200);
    const q = args.q?.trim();

    if (q) {
      const byEmail = q.includes("@");
      const idxName = byEmail ? "search_email" : "search_fullName";
      const searchField = byEmail ? "email" : "fullName";

      const rows = await ctx.db
        .query("users")
        .withSearchIndex(idxName, (s) => {
          let builder = s.search(searchField as any, q);
          if (args.role) builder = builder.eq("role", args.role);
          return builder;
        })
        .take(limit);

      return rows;
    }

    const rows = await ctx.db.query("users").collect();
    return rows
      .filter((u) => (args.role ? u.role === args.role : true))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export const getUsersOverview = query({
  args: {
    demoClerkId: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("client"), v.literal("provider"), v.literal("admin")),
    ),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const limit = Math.min(args.limit ?? 100, 200);
    const q = args.q?.trim();

    let users;
    if (q) {
      const byEmail = q.includes("@");
      const idxName = byEmail ? "search_email" : "search_fullName";
      const searchField = byEmail ? "email" : "fullName";

      users = await ctx.db
        .query("users")
        .withSearchIndex(idxName, (s) => {
          let builder = s.search(searchField as any, q);
          if (args.role) builder = builder.eq("role", args.role);
          return builder;
        })
        .take(limit);
    } else {
      users = (await ctx.db.query("users").collect())
        .filter((u) => (args.role ? u.role === args.role : true))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }

    const out = [];
    for (const u of users) {
      const providerProfile =
        u.role === "provider"
          ? await ctx.db
              .query("providerProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", u._id))
              .unique()
          : null;
      out.push({ user: u, providerProfile });
    }
    return out;
  },
});

export const toggleUserStatus = mutation({
  args: { demoClerkId: v.optional(v.string()), userId: v.id("users"), isSuspended: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    await ctx.db.patch(args.userId, { isSuspended: args.isSuspended });
    return true;
  },
});

export const verifyProvider = mutation({
  args: { demoClerkId: v.optional(v.string()), userId: v.id("users"), isVerified: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) throw new ConvexError("Provider profile not found");
    await ctx.db.patch(profile._id, { isVerified: args.isVerified, updatedAt: Date.now() });
    return true;
  },
});

export const getAllRequests = query({
  args: {
    demoClerkId: v.optional(v.string()),
    status: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const limit = Math.min(args.limit ?? 200, 500);
    const rows = await ctx.db.query("serviceRequests").collect();
    return rows
      .filter((r) => (args.status ? r.status === args.status : true))
      .filter((r) => (args.categorySlug ? r.categorySlug === args.categorySlug : true))
      .filter((r) => (args.city ? r.city === args.city : true))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export const deleteReview = mutation({
  args: { demoClerkId: v.optional(v.string()), reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const review = await ctx.db.get(args.reviewId);
    if (!review) return true;

    await ctx.db.delete(review._id);

    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", review.providerId))
      .unique();
    if (profile) {
      const remaining = await ctx.db
        .query("reviews")
        .withIndex("by_providerId", (q) => q.eq("providerId", review.providerId))
        .collect();
      const reviewCount = remaining.length;
      const avgRating =
        reviewCount === 0
          ? 0
          : remaining.reduce((acc, r) => acc + r.rating, 0) / reviewCount;
      await ctx.db.patch(profile._id, {
        reviewCount,
        avgRating: Math.round(avgRating * 10) / 10,
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

export const getAllReviews = query({
  args: { demoClerkId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    requireAdmin(me);

    const limit = Math.min(args.limit ?? 200, 500);
    const rows = await ctx.db.query("reviews").order("desc").take(limit);

    const out = [];
    for (const r of rows) {
      const client = await ctx.db.get(r.clientId);
      const provider = await ctx.db.get(r.providerId);
      const request = await ctx.db.get(r.requestId);
      out.push({ review: r, client, provider, request });
    }
    return out;
  },
});

function dateKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function groupByDay(timestamps: number[], days: number) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  }

  const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const ts of timestamps) {
    const k = dateKey(ts);
    if (k in counts) counts[k] += 1;
  }

  return keys.map((k) => ({ day: k, count: counts[k] }));
}
