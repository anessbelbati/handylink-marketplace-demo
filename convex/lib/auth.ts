import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function demoAuthEnabled() {
  return process.env.ALLOW_DEMO_AUTH === "1";
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
  demoClerkId?: string,
) {
  const identity = await ctx.auth.getUserIdentity();

  // Clerk's `sub` is the user id (e.g. "user_...").
  // In demo mode, allow a client-provided clerkId override for local testing only.
  const clerkId =
    identity?.subject ?? (demoAuthEnabled() ? demoClerkId : undefined);

  if (!clerkId) return null;
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  demoClerkId?: string,
) {
  const user = await getCurrentUser(ctx, demoClerkId);
  if (!user) throw new ConvexError("Unauthorized");
  if (user.isSuspended) throw new ConvexError("Account suspended");
  return user;
}

export function requireAdmin(user: { isAdmin: boolean }) {
  if (!user.isAdmin) throw new ConvexError("Forbidden");
}
