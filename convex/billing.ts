import { action, internalMutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import { requireUser } from "./lib/auth";

function getPolarApiBase() {
  const server = (process.env.POLAR_SERVER ?? "sandbox").toLowerCase();
  if (server === "production" || server === "prod") return "https://api.polar.sh/v1";
  return "https://sandbox-api.polar.sh/v1";
}

export const getMyPlan = query({
  args: { demoClerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.demoClerkId);
    return {
      plan: me.plan ?? "free",
      planUpdatedAt: me.planUpdatedAt ?? null,
      polarCustomerId: me.polarCustomerId ?? null,
    };
  },
});

export const createProCheckout = action({
  args: {
    demoClerkId: v.optional(v.string()),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(
      api.users.getMe,
      args.demoClerkId ? { demoClerkId: args.demoClerkId } : {},
    );
    if (!me) throw new ConvexError("Unauthorized");
    if (me.isSuspended) throw new ConvexError("Account suspended");
    if (me.role !== "provider" && !me.isAdmin) {
      throw new ConvexError("Only providers can upgrade");
    }

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const productId = process.env.POLAR_PRO_PRODUCT_ID;
    if (!accessToken || !productId) {
      throw new ConvexError(
        "Payments are not configured. Set POLAR_ACCESS_TOKEN and POLAR_PRO_PRODUCT_ID in Convex env.",
      );
    }

    let origin: string;
    try {
      origin = new URL(args.origin).origin;
    } catch {
      throw new ConvexError("Invalid origin");
    }

    const successUrl = `${origin}/dashboard/billing?success=1`;
    const returnUrl = `${origin}/dashboard/billing`;

    const res = await fetch(`${getPolarApiBase()}/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        success_url: successUrl,
        return_url: returnUrl,
        external_customer_id: me.clerkId,
        customer_email: me.email,
        customer_name: me.fullName,
        metadata: {
          clerkId: me.clerkId,
          convexUserId: String(me._id),
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ConvexError(
        `Polar checkout failed (${res.status}). ${text ? text.slice(0, 300) : ""}`.trim(),
      );
    }

    const json: any = await res.json();
    const url = json?.url ?? json?.checkout_url ?? json?.redirect_url;
    if (!url || typeof url !== "string") {
      throw new ConvexError("Polar checkout failed (missing URL)");
    }

    return { url };
  },
});

export const applyCustomerStateFromPolar = internalMutation({
  args: {
    externalCustomerId: v.string(),
    polarCustomerId: v.optional(v.string()),
    hasPro: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.externalCustomerId))
      .unique();
    if (!user) return null;

    await ctx.db.patch(user._id, {
      plan: args.hasPro ? "pro" : "free",
      planUpdatedAt: Date.now(),
      polarCustomerId: args.polarCustomerId,
    });
    return true;
  },
});
