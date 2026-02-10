import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireUser } from "./lib/auth";

export const getMyProfile = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    return await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .unique();
  },
});

export const getProvider = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) return null;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.userId))
      .order("desc")
      .take(25);

    return { user, profile, reviews };
  },
});

export const getProviders = query({
  args: {
    city: v.optional(v.string()),
    category: v.optional(v.string()),
    q: v.optional(v.string()),
    availableOnly: v.optional(v.boolean()),
    verifiedOnly: v.optional(v.boolean()),
    sort: v.optional(v.union(v.literal("rating"), v.literal("newest"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    // Search by provider name (users table) and bio (providerProfiles) when q is present; otherwise list profiles.
    if (args.q && args.q.trim().length > 0) {
      const q = args.q.trim();
      const takeN = Math.min(limit * 3, 200);

      const users = await ctx.db
        .query("users")
        .withSearchIndex("search_fullName", (s) =>
          s.search("fullName", q).eq("role", "provider").eq("isSuspended", false),
        )
        .take(takeN);

      const bios = await ctx.db
        .query("providerProfiles")
        .withSearchIndex("search_bio", (s) => {
          let q1 = s.search("bio", q);
          if (args.city) q1 = q1.eq("city", args.city);
          if (args.availableOnly) q1 = q1.eq("isAvailable", true);
          if (args.verifiedOnly) q1 = q1.eq("isVerified", true);
          return q1;
        })
        .take(takeN);

      const byUserId = new Map<string, { user: any; profile: any }>();

      for (const u of users) {
        const p = await ctx.db
          .query("providerProfiles")
          .withIndex("by_userId", (idx) => idx.eq("userId", u._id))
          .unique();
        if (!p) continue;

        if (args.city && p.city !== args.city) continue;
        if (args.availableOnly && !p.isAvailable) continue;
        if (args.verifiedOnly && !p.isVerified) continue;
        if (args.category && !p.categories.includes(args.category)) continue;
        byUserId.set(String(u._id), { user: u, profile: p });
      }

      for (const p of bios) {
        if (args.city && p.city !== args.city) continue;
        if (args.availableOnly && !p.isAvailable) continue;
        if (args.verifiedOnly && !p.isVerified) continue;
        if (args.category && !p.categories.includes(args.category)) continue;

        const u = await ctx.db.get(p.userId);
        if (!u) continue;
        if (u.role !== "provider") continue;
        if (u.isSuspended) continue;
        byUserId.set(String(u._id), { user: u, profile: p });
      }

      const rows = sortProviders(Array.from(byUserId.values()), args.sort);
      return rows.slice(0, limit);
    }

    let profiles = [];
    if (args.city) {
      profiles = await ctx.db
        .query("providerProfiles")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .collect();
    } else if (args.availableOnly) {
      profiles = await ctx.db
        .query("providerProfiles")
        .withIndex("by_available", (q) => q.eq("isAvailable", true))
        .collect();
    } else {
      profiles = await ctx.db.query("providerProfiles").collect();
    }

    const filtered = profiles.filter((p) => {
      if (args.availableOnly && !p.isAvailable) return false;
      if (args.verifiedOnly && !p.isVerified) return false;
      if (args.category && !p.categories.includes(args.category)) return false;
      return true;
    });

    const rows = [];
    for (const p of filtered.slice(0, limit)) {
      const u = await ctx.db.get(p.userId);
      if (!u) continue;
      if (u.isSuspended) continue;
      rows.push({ user: u, profile: p });
    }

    return sortProviders(rows, args.sort);
  },
});

function sortProviders(
  rows: Array<{ user: any; profile: any }>,
  sort: "rating" | "newest" | undefined,
) {
  const sorted = [...rows];
  if (sort === "newest") {
    sorted.sort((a, b) => b.profile.createdAt - a.profile.createdAt);
  } else {
    // default: rating
    sorted.sort((a, b) => {
      const dr = b.profile.avgRating - a.profile.avgRating;
      if (dr !== 0) return dr;
      const dc = b.profile.reviewCount - a.profile.reviewCount;
      if (dc !== 0) return dc;
      return b.profile.createdAt - a.profile.createdAt;
    });
  }
  return sorted;
}

export const updateProviderProfile = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    bio: v.string(),
    categories: v.array(v.string()),
    serviceAreas: v.array(v.string()),
    rateMin: v.optional(v.number()),
    rateMax: v.optional(v.number()),
    yearsExperience: v.optional(v.number()),
    lat: v.number(),
    lng: v.number(),
    address: v.string(),
    city: v.string(),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Only providers can edit provider profiles");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        bio: args.bio,
        categories: args.categories,
        serviceAreas: args.serviceAreas,
        rateMin: args.rateMin,
        rateMax: args.rateMax,
        yearsExperience: args.yearsExperience,
        lat: args.lat,
        lng: args.lng,
        address: args.address,
        city: args.city,
        isAvailable: args.isAvailable,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("providerProfiles", {
      userId: me._id,
      bio: args.bio,
      categories: args.categories,
      serviceAreas: args.serviceAreas,
      portfolioImages: [],
      rateMin: args.rateMin,
      rateMax: args.rateMax,
      yearsExperience: args.yearsExperience,
      isVerified: false,
      isAvailable: args.isAvailable,
      avgRating: 0,
      reviewCount: 0,
      lat: args.lat,
      lng: args.lng,
      address: args.address,
      city: args.city,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const addPortfolioImage = mutation({
  args: { demoClerkId: v.optional(v.string()), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Only providers can add portfolio images");
    }

    const profile = await ctx.db
      .query("providerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .unique();
    if (!profile) throw new ConvexError("Missing provider profile");

    await ctx.db.patch(profile._id, {
      portfolioImages: [...profile.portfolioImages, args.storageId],
      updatedAt: Date.now(),
    });
    return true;
  },
});
