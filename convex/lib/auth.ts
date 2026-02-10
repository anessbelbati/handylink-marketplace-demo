import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Clerk's `sub` is the user id (e.g. "user_...").
  const clerkId = identity.subject;
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("Unauthorized");
  if (user.isSuspended) throw new ConvexError("Account suspended");
  return user;
}

export function requireAdmin(user: { isAdmin: boolean }) {
  if (!user.isAdmin) throw new ConvexError("Forbidden");
}

