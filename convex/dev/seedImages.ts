import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const categoryKeywords: Record<string, string[]> = {
  plumber: ["plumbing", "pipes", "tools"],
  electrician: ["electrician", "wiring", "tools"],
  painter: ["painting", "paint", "roller"],
  carpenter: ["carpentry", "woodworking", "tools"],
  cleaner: ["cleaning", "home", "supplies"],
  mover: ["moving", "boxes", "truck"],
  locksmith: ["lock", "keys", "door"],
  hvac: ["hvac", "air-conditioning", "thermostat"],
};

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function buildUnsplashSourceUrl(keywords: string[], sig: number) {
  const q = [...keywords, String(sig)].join(",");
  return `https://source.unsplash.com/1200x800/?${encodeURIComponent(q)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const getSeedImageTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providerProfiles").collect();
    const requests = await ctx.db.query("serviceRequests").collect();

    return {
      providers: providers.map((p) => ({
        profileId: p._id,
        userId: p.userId,
        categories: p.categories,
        city: p.city,
        portfolioImages: p.portfolioImages,
      })),
      requests: requests.map((r) => ({
        requestId: r._id,
        categorySlug: r.categorySlug,
        city: r.city,
        images: r.images,
      })),
    };
  },
});

export const applySeedImages = internalMutation({
  args: {
    providers: v.array(
      v.object({
        profileId: v.id("providerProfiles"),
        portfolioImages: v.array(v.id("_storage")),
      }),
    ),
    requests: v.array(
      v.object({
        requestId: v.id("serviceRequests"),
        images: v.array(v.id("_storage")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const p of args.providers) {
      await ctx.db.patch(p.profileId, {
        portfolioImages: p.portfolioImages,
        updatedAt: now,
      });
    }
    for (const r of args.requests) {
      await ctx.db.patch(r.requestId, {
        images: r.images,
        updatedAt: now,
      });
    }
    return true;
  },
});

export const seedImages = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const targets = await ctx.runQuery(internal.dev.seedImages.getSeedImageTargets, {});

    const providerTargets = targets.providers.filter(
      (p) => args.force || p.portfolioImages.length === 0,
    );
    const requestTargets = targets.requests.filter(
      (r) => args.force || r.images.length === 0,
    );

    if (providerTargets.length === 0 && requestTargets.length === 0) {
      return { ok: true, skipped: true };
    }

    const wantedCategories = new Set<string>();
    for (const p of providerTargets) for (const c of p.categories) wantedCategories.add(c);
    for (const r of requestTargets) wantedCategories.add(r.categorySlug);

    const categoriesToFetch = uniq(Array.from(wantedCategories)).filter(Boolean);
    const byCategory: Record<string, Id<"_storage">[]> = {};

    async function tryFetchAndStore(url: string) {
      const resp = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "HandyLinkSeed/1.0" },
      });
      if (!resp.ok) return null;
      const ct = resp.headers.get("content-type") ?? "application/octet-stream";
      if (!ct.toLowerCase().startsWith("image/")) return null;
      const buf = await resp.arrayBuffer();
      const blob = new Blob([buf], { type: ct });
      return (await ctx.storage.store(blob)) as Id<"_storage">;
    }

    async function fetchWithFallback(keywords: string[], sig: number) {
      const unsplashUrl = buildUnsplashSourceUrl(keywords, sig);
      const picsumUrl = `https://picsum.photos/seed/${sig}/1200/800`;

      // A couple retries helps with transient 5xx responses.
      for (let attempt = 0; attempt < 3; attempt++) {
        const id1 = await tryFetchAndStore(unsplashUrl);
        if (id1) return id1;

        const id2 = await tryFetchAndStore(picsumUrl);
        if (id2) return id2;

        await sleep(350 * (attempt + 1));
      }

      return null;
    }

    // Fetch a small curated set of images per category (2 each) and reuse across docs.
    let sig = Math.floor(Math.random() * 100_000);
    for (const category of categoriesToFetch) {
      const keywords = categoryKeywords[category] ?? ["home", "repair", "tools"];
      const ids: Id<"_storage">[] = [];
      for (let i = 0; i < 2; i++) {
        const id = await fetchWithFallback(keywords, sig++);
        if (id) ids.push(id);
      }
      if (ids.length > 0) byCategory[category] = ids;
    }

    const allImageIds = uniq(Object.values(byCategory).flat());
    const fallback = allImageIds.length > 0 ? allImageIds : [];

    function pickFromCategory(category: string) {
      const ids = byCategory[category];
      if (ids && ids.length > 0) return pick(ids);
      if (fallback.length > 0) return pick(fallback);
      return null;
    }

    const providerPatches: Array<{
      profileId: Id<"providerProfiles">;
      portfolioImages: Id<"_storage">[];
    }> = [];

    for (const p of providerTargets) {
      const imgs: Id<"_storage">[] = [];
      for (const c of (p.categories ?? []).slice(0, 3)) {
        const id = pickFromCategory(c);
        if (id) imgs.push(id);
      }
      while (imgs.length < 3) {
        const id = pickFromCategory(pick(categoriesToFetch.length ? categoriesToFetch : ["home"]));
        if (!id) break;
        imgs.push(id);
      }
      providerPatches.push({
        profileId: p.profileId,
        portfolioImages: uniq(imgs).slice(0, 6),
      });
    }

    const requestPatches: Array<{
      requestId: Id<"serviceRequests">;
      images: Id<"_storage">[];
    }> = [];

    for (const r of requestTargets) {
      const imgs: Id<"_storage">[] = [];
      for (let i = 0; i < 2; i++) {
        const id = pickFromCategory(r.categorySlug);
        if (id) imgs.push(id);
      }
      requestPatches.push({
        requestId: r.requestId,
        images: uniq(imgs).slice(0, 4),
      });
    }

    await ctx.runMutation(internal.dev.seedImages.applySeedImages, {
      providers: providerPatches,
      requests: requestPatches,
    });

    return {
      ok: true,
      skipped: false,
      categoriesSeeded: categoriesToFetch.length,
      providersUpdated: providerPatches.length,
      requestsUpdated: requestPatches.length,
      imagesStored: allImageIds.length,
    };
  },
});
