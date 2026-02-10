import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireUser } from "./lib/auth";

export const startConversation = mutation({
  args: {
    otherUserId: v.id("users"),
    requestId: v.optional(v.id("serviceRequests")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    if (args.otherUserId === me._id) {
      throw new ConvexError("Can't start a conversation with yourself");
    }

    const other = await ctx.db.get(args.otherUserId);
    if (!other) throw new ConvexError("User not found");

    // Reuse an existing conversation between these two users for the same request.
    const myMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();
    for (const m of myMemberships) {
      if (m.otherUserId !== other._id) continue;
      const conv = await ctx.db.get(m.conversationId);
      if (!conv) continue;
      if ((conv.requestId ?? null) === (args.requestId ?? null)) {
        return conv._id;
      }
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      requestId: args.requestId,
      participantIds: [me._id, other._id],
      lastMessageAt: now,
      createdAt: now,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: me._id,
      otherUserId: other._id,
      unreadCount: 0,
      lastReadAt: now,
      createdAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: other._id,
      otherUserId: me._id,
      unreadCount: 0,
      lastReadAt: now,
      createdAt: now,
    });

    return conversationId;
  },
});

export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();

    const rows = [];
    for (const m of memberships) {
      const conv = await ctx.db.get(m.conversationId);
      if (!conv) continue;
      const other = await ctx.db.get(m.otherUserId);
      rows.push({
        conversation: conv,
        otherUser: other,
        unreadCount: m.unreadCount,
      });
    }

    rows.sort((a, b) => b.conversation.lastMessageAt - a.conversation.lastMessageAt);
    return rows;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();
    if (!membership) throw new ConvexError("Forbidden");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const otherUser = await ctx.db.get(membership.otherUserId);
    const request = conversation.requestId
      ? await ctx.db.get(conversation.requestId)
      : null;

    return {
      conversation,
      otherUser,
      unreadCount: membership.unreadCount,
      request,
    };
  },
});
