import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { requireUser } from "./lib/auth";

async function requireMembership(
  ctx: any,
  conversationId: any,
  userId: any,
) {
  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId_userId", (q: any) =>
      q.eq("conversationId", conversationId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new ConvexError("Forbidden");
  return membership;
}

export const getMessages = query({
  args: {
    demoClerkId: v.optional(v.string()),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    await requireMembership(ctx, args.conversationId, me._id);

    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getTyping = query({
  args: {
    demoClerkId: v.optional(v.string()),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    await requireMembership(ctx, args.conversationId, me._id);

    const now = Date.now();
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const otherTyping = members.some(
      (m) =>
        m.userId !== me._id &&
        (m.lastTypingAt ?? 0) > now - 3000,
    );

    return { otherTyping };
  },
});

export const setTyping = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const membership = await requireMembership(ctx, args.conversationId, me._id);

    await ctx.db.patch(membership._id, { lastTypingAt: Date.now() });
    return true;
  },
});

export const sendMessage = mutation({
  args: {
    demoClerkId: v.optional(v.string()),
    conversationId: v.id("conversations"),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const membership = await requireMembership(ctx, args.conversationId, me._id);

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new ConvexError("Conversation not found");

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      content: args.content,
      imageStorageId: args.imageStorageId,
      isRead: false,
      createdAt: now,
    });

    await ctx.db.patch(conv._id, {
      lastMessageAt: now,
      lastMessageText: args.imageStorageId ? "[image]" : args.content,
      lastMessageSenderId: me._id,
    });

    // Increment unread count for the other participant.
    const otherMembership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", conv._id).eq("userId", membership.otherUserId),
      )
      .unique();
    if (otherMembership) {
      await ctx.db.patch(otherMembership._id, {
        unreadCount: otherMembership.unreadCount + 1,
      });
    }

    await ctx.db.insert("notifications", {
      userId: membership.otherUserId,
      type: "new_message",
      title: "New message",
      body: `${me.fullName}: ${args.imageStorageId ? "Sent an image" : args.content}`,
      data: { conversationId: conv._id, messageId },
      isRead: false,
      createdAt: now,
    });

    return messageId;
  },
});

export const markAsRead = mutation({
  args: { demoClerkId: v.optional(v.string()), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    const membership = await requireMembership(ctx, args.conversationId, me._id);

    // Mark unread incoming messages as read (best-effort, cap work).
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(200);

    for (const msg of recent) {
      if (msg.senderId === me._id) continue;
      if (msg.isRead) continue;
      await ctx.db.patch(msg._id, { isRead: true });
    }

    await ctx.db.patch(membership._id, {
      unreadCount: 0,
      lastReadAt: Date.now(),
    });
    return true;
  },
});
