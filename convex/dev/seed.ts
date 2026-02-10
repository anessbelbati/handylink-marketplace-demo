import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const cities = [
  { city: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { city: "Austin", lat: 30.2672, lng: -97.7431 },
  { city: "New York", lat: 40.7128, lng: -74.006 },
  { city: "Chicago", lat: 41.8781, lng: -87.6298 },
];

const categories = [
  { slug: "plumber", name: "Plumber", icon: "wrench", sortOrder: 1 },
  { slug: "electrician", name: "Electrician", icon: "zap", sortOrder: 2 },
  { slug: "painter", name: "Painter", icon: "paintbrush", sortOrder: 3 },
  { slug: "carpenter", name: "Carpenter", icon: "hammer", sortOrder: 4 },
  { slug: "cleaner", name: "Cleaning", icon: "sparkles", sortOrder: 5 },
  { slug: "mover", name: "Moving", icon: "truck", sortOrder: 6 },
  { slug: "locksmith", name: "Locksmith", icon: "key", sortOrder: 7 },
  { slug: "hvac", name: "HVAC", icon: "thermometer", sortOrder: 8 },
];

const providerNames = [
  "Ava Bennett",
  "Noah Carter",
  "Maya Rivera",
  "Ethan Brooks",
  "Sofia Patel",
  "Leo Nguyen",
  "Isabella Moore",
  "Jack Wilson",
  "Amir Hassan",
  "Chloe Martin",
  "Daniel Kim",
  "Layla Johnson",
  "Owen Davis",
  "Nora Garcia",
  "Zoe Thompson",
];

const clientNames = [
  "Sam Walker",
  "Taylor Reed",
  "Jordan Lee",
  "Morgan Bell",
  "Casey Adams",
  "Riley Perez",
  "Avery Cooper",
  "Parker Evans",
  "Quinn Baker",
  "Hayden Scott",
];

const bios = [
  "Clear pricing. Clean work. I treat your home like my own.",
  "Fast response times and meticulous attention to detail.",
  "Licensed, insured, and obsessed with doing it right the first time.",
  "I show up on time, communicate clearly, and leave the space spotless.",
  "Quality craftsmanship with a modern, no-drama process.",
];

const requestTitles = [
  "Fix leaking kitchen faucet",
  "Install ceiling fan in bedroom",
  "Repaint living room walls",
  "Replace broken door lock",
  "Deep clean after move-out",
  "Assemble flat-pack furniture",
  "Diagnose HVAC not cooling",
  "Repair drywall hole and paint",
  "Move a couch and two dressers",
  "Install smart thermostat",
  "Unclog shower drain",
  "Replace light switches",
];

const requestDescriptions = [
  "Looking for someone who can take care of this ASAP. Photos available. Please include your availability.",
  "Need a professional with experience. I prefer a clean setup and good communication.",
  "I can be flexible on timing this week. Budget depends on scope; happy to discuss.",
  "Please confirm you have the right tools. I'd like an estimate before you start.",
  "I'd like this done with minimal disruption. Thank you!",
];

function jitter(base: number) {
  return base + (Math.random() - 0.5) * 0.06;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], min: number, max: number) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

async function clearTable(ctx: any, tableName: any) {
  const rows = await ctx.db.query(tableName).collect();
  for (const r of rows) await ctx.db.delete(r._id);
}

export const seed = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const already =
      (await ctx.db.query("categories").first()) ||
      (await ctx.db.query("providerProfiles").first());
    if (already && !args.force) {
      return { ok: true, skipped: true };
    }

    if (args.force) {
      await clearTable(ctx, "messages");
      await clearTable(ctx, "conversationMembers");
      await clearTable(ctx, "conversations");
      await clearTable(ctx, "notifications");
      await clearTable(ctx, "reviews");
      await clearTable(ctx, "quotes");
      await clearTable(ctx, "serviceRequests");
      await clearTable(ctx, "providerProfiles");
      await clearTable(ctx, "users");
      await clearTable(ctx, "categories");
    }

    // Categories
    for (const c of categories) {
      await ctx.db.insert("categories", {
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isActive: true,
      });
    }

    const now = Date.now();

    // Users + provider profiles
    const providerUserIds: Id<"users">[] = [];
    for (let i = 0; i < providerNames.length; i++) {
      const name = providerNames[i];
      const city = pick(cities);
      const userId = await ctx.db.insert("users", {
        clerkId: `seed_provider_${i}`,
        email: `provider${i}@handylink.demo`,
        fullName: name,
        avatarUrl: undefined,
        role: "provider",
        isSuspended: false,
        isAdmin: false,
        createdAt: now - i * 36_000_00,
      });
      providerUserIds.push(userId);

      const cats = pickMany(categories, 1, 3).map((c) => c.slug);
      await ctx.db.insert("providerProfiles", {
        userId,
        bio: pick(bios),
        categories: cats,
        serviceAreas: [city.city],
        portfolioImages: [],
        rateMin: 60 + Math.floor(Math.random() * 40),
        rateMax: 120 + Math.floor(Math.random() * 80),
        yearsExperience: 2 + Math.floor(Math.random() * 12),
        isVerified: Math.random() < 0.45,
        isAvailable: Math.random() < 0.9,
        avgRating: 0,
        reviewCount: 0,
        lat: jitter(city.lat),
        lng: jitter(city.lng),
        address: `${100 + Math.floor(Math.random() * 800)} Market St`,
        city: city.city,
        createdAt: now - i * 24_000_00,
        updatedAt: now - i * 12_000_00,
      });
    }

    const clientUserIds: Id<"users">[] = [];
    for (let i = 0; i < clientNames.length; i++) {
      const name = clientNames[i];
      const userId = await ctx.db.insert("users", {
        clerkId: `seed_client_${i}`,
        email: `client${i}@handylink.demo`,
        fullName: name,
        avatarUrl: undefined,
        role: "client",
        isSuspended: false,
        isAdmin: false,
        createdAt: now - i * 18_000_00,
      });
      clientUserIds.push(userId);
    }

    // Requests
    const requestIds: Id<"serviceRequests">[] = [];
    for (let i = 0; i < 14; i++) {
      const clientId = pick(clientUserIds);
      const city = pick(cities);
      const category = pick(categories);
      const statusPick = Math.random();
      const status =
        statusPick < 0.5
          ? "open"
          : statusPick < 0.7
            ? "in_discussion"
            : statusPick < 0.85
              ? "accepted"
              : "completed";

      const id: Id<"serviceRequests"> = await ctx.db.insert("serviceRequests", {
        clientId,
        categorySlug: category.slug,
        title: pick(requestTitles),
        description: pick(requestDescriptions),
        images: [],
        lat: jitter(city.lat),
        lng: jitter(city.lng),
        address: `${200 + Math.floor(Math.random() * 900)} Main St`,
        city: city.city,
        urgency: pick(["low", "medium", "urgent"] as const),
        status,
        budgetMin: 120,
        budgetMax: 450,
        createdAt: now - i * 10_000_00,
        updatedAt: now - i * 9_000_00,
      });
      requestIds.push(id);
    }

    // Quotes + link acceptedQuoteId
    for (const rid of requestIds) {
      const req = await ctx.db.get(rid);
      if (!req) continue;

      const matchingProviders = await ctx.db
        .query("providerProfiles")
        .withIndex("by_city", (q: any) => q.eq("city", req.city))
        .collect();
      const eligible = matchingProviders
        .filter((p: any) => p.categories.includes(req.categorySlug))
        .slice(0, 6);
      if (eligible.length === 0) continue;

      const quoteCount = req.status === "open" ? 0 : 1 + Math.floor(Math.random() * 3);
      const chosen = pickMany(eligible, Math.min(quoteCount, eligible.length), Math.min(quoteCount, eligible.length));

      const quoteIds: Id<"quotes">[] = [];
      for (const p of chosen) {
        const qid: Id<"quotes"> = await ctx.db.insert("quotes", {
          requestId: req._id,
          providerId: p.userId,
          amount: 150 + Math.floor(Math.random() * 400),
          message:
            "I can take this on this week. Happy to share a quick breakdown and timeline.",
          status: "pending",
          createdAt: req.createdAt + 2_000_00,
        });
        quoteIds.push(qid);
      }

      if ((req.status === "accepted" || req.status === "completed") && quoteIds.length > 0) {
        const accepted = quoteIds[0];
        const all = await ctx.db
          .query("quotes")
          .withIndex("by_requestId", (q: any) => q.eq("requestId", req._id))
          .collect();
        for (const q of all) {
          await ctx.db.patch(q._id, { status: q._id === accepted ? "accepted" : "declined" });
        }
        await ctx.db.patch(req._id, { acceptedQuoteId: accepted });
      }
    }

    // Conversations + messages (5-8)
    const conversationIds: Id<"conversations">[] = [];
    for (let i = 0; i < 7; i++) {
      const req = await ctx.db.get(pick(requestIds));
      if (!req) continue;

      const acceptedQuote =
        req.acceptedQuoteId ? await ctx.db.get(req.acceptedQuoteId) : null;
      const providerId = acceptedQuote?.providerId ?? pick(providerUserIds);
      const clientId = req.clientId;

      const cid = await ctx.db.insert("conversations", {
        requestId: req._id,
        participantIds: [clientId, providerId],
        lastMessageAt: now - i * 2_000_00,
        lastMessageText: "Sounds good. See you then!",
        lastMessageSenderId: providerId,
        createdAt: now - i * 3_000_00,
      });
      conversationIds.push(cid);

      await ctx.db.insert("conversationMembers", {
        conversationId: cid,
        userId: clientId,
        otherUserId: providerId,
        unreadCount: 0,
        lastReadAt: now,
        createdAt: now,
      });
      await ctx.db.insert("conversationMembers", {
        conversationId: cid,
        userId: providerId,
        otherUserId: clientId,
        unreadCount: Math.random() < 0.3 ? 2 : 0,
        lastReadAt: now,
        createdAt: now,
      });

      const thread = [
        { from: clientId, text: `Hi! Are you available for: ${req.title}?` },
        { from: providerId, text: "Yes, I can help. Can you share a couple details?" },
        { from: clientId, text: pick(requestDescriptions) },
        { from: providerId, text: "Perfect. I can come by tomorrow afternoon." },
        { from: clientId, text: "Tomorrow works. Thank you!" },
        { from: providerId, text: "Sounds good. See you then!" },
      ];
      for (let j = 0; j < thread.length; j++) {
        const msg = thread[j];
        await ctx.db.insert("messages", {
          conversationId: cid,
          senderId: msg.from,
          content: msg.text,
          isRead: true,
          createdAt: now - (thread.length - j) * 30_000,
        });
      }
    }

    // Reviews (30-40) for completed requests
    const completedReqs = (await ctx.db.query("serviceRequests").collect()).filter(
      (r: any) => r.status === "completed" && r.acceptedQuoteId,
    );
    let reviewTarget = 34;
    for (const req of completedReqs) {
      if (reviewTarget <= 0) break;
      const accepted = req.acceptedQuoteId ? await ctx.db.get(req.acceptedQuoteId) : null;
      if (!accepted) continue;
      const rating = 3 + Math.floor(Math.random() * 3); // 3-5
      await ctx.db.insert("reviews", {
        requestId: req._id,
        clientId: req.clientId,
        providerId: accepted.providerId,
        rating,
        comment:
          rating >= 5
            ? "Great communication and clean work. Would hire again."
            : rating === 4
              ? "Solid work and on time. Recommended."
              : "Got it done, a couple minor delays but overall ok.",
        createdAt: req.updatedAt + 6_000_00,
      });
      reviewTarget -= 1;
    }

    // Recompute provider rating aggregates.
    const profiles = await ctx.db.query("providerProfiles").collect();
    for (const p of profiles) {
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_providerId", (q: any) => q.eq("providerId", p.userId))
        .collect();
      const reviewCount = reviews.length;
      const avg =
        reviewCount === 0
          ? 0
          : reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
            reviewCount;
      await ctx.db.patch(p._id, {
        reviewCount,
        avgRating: Math.round(avg * 10) / 10,
        updatedAt: Date.now(),
      });
    }

    return { ok: true, skipped: false, conversationIds };
  },
});
