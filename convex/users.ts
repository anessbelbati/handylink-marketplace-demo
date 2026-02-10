import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { getCurrentUser, requireUser } from "./lib/auth";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const registerUser = mutation({
  args: {
    role: v.union(v.literal("client"), v.literal("provider")),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) return existing;

    const createdAt = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      fullName: args.fullName,
      avatarUrl: args.avatarUrl,
      role: args.role,
      isSuspended: false,
      isAdmin: false,
      createdAt,
    });
    return await ctx.db.get(userId);
  },
});

export const updateMe = mutation({
  args: {
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const patch: { fullName?: string; avatarUrl?: string } = {};
    if (args.fullName !== undefined) patch.fullName = args.fullName;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    await ctx.db.patch(me._id, patch);
    return await ctx.db.get(me._id);
  },
});

