import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { requireAdmin, requireUser } from "./lib/auth";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_sortOrder")
      .collect();
    return cats.filter((c) => c.isActive);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").withIndex("by_sortOrder").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    requireAdmin(me);

    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new ConvexError("Invalid slug");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        icon: args.icon,
        sortOrder: args.sortOrder,
        isActive: args.isActive,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("categories", {
      slug,
      name: args.name,
      icon: args.icon,
      sortOrder: args.sortOrder,
      isActive: args.isActive,
    });
    return await ctx.db.get(id);
  },
});

export const reorder = mutation({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    requireAdmin(me);

    const all = await ctx.db.query("categories").collect();
    const bySlug = new Map(all.map((c) => [c.slug, c]));
    for (let i = 0; i < args.slugs.length; i++) {
      const slug = args.slugs[i];
      const cat = bySlug.get(slug);
      if (!cat) continue;
      await ctx.db.patch(cat._id, { sortOrder: i + 1 });
    }
    return true;
  },
});

