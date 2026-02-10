import { action, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";

export const generateUploadUrl = action({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Only authenticated users can upload files.
    // (In demo auth mode, this is guarded by `ALLOW_DEMO_AUTH` in convex/lib/auth.ts via users.getMe.)
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");

    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const entries = await Promise.all(
      args.storageIds.map(async (id) => [id, await ctx.storage.getUrl(id)] as const),
    );
    return Object.fromEntries(entries);
  },
});
