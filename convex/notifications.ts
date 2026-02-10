import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireUser } from "./lib/auth";

export const getNotifications = query({
  args: { demoClerkId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const limit = Math.min(args.limit ?? 50, 200);

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(limit);

    // Ensure newest-first by createdAt.
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getUnreadCount = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    return rows.filter((n) => !n.isRead).length;
  },
});

export const markNotificationsRead = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    ids: v.optional(v.array(v.id("notifications"))),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    if (args.ids && args.ids.length > 0) {
      for (const id of args.ids) {
        const n = await ctx.db.get(id);
        if (!n) continue;
        if (n.userId !== me._id) continue;
        await ctx.db.patch(id, { isRead: true });
      }
      return true;
    }

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    for (const n of rows) {
      if (n.isRead) continue;
      await ctx.db.patch(n._id, { isRead: true });
    }
    return true;
  },
});
