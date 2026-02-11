import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("client"), v.literal("provider"), v.literal("admin")),
    isSuspended: v.boolean(),
    isAdmin: v.boolean(),
    // Stripe Connect (providers)
    stripeConnectAccountId: v.optional(v.string()),
    stripeChargesEnabled: v.optional(v.boolean()),
    stripePayoutsEnabled: v.optional(v.boolean()),
    stripeDetailsSubmitted: v.optional(v.boolean()),
    stripeOnboardedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"])
    .index("by_stripeConnectAccountId", ["stripeConnectAccountId"])
    .searchIndex("search_fullName", {
      searchField: "fullName",
      filterFields: ["role", "isSuspended"],
    })
    .searchIndex("search_email", {
      searchField: "email",
      filterFields: ["role", "isSuspended"],
    }),

  providerProfiles: defineTable({
    userId: v.id("users"),
    bio: v.string(),
    categories: v.array(v.string()),
    serviceAreas: v.array(v.string()),
    portfolioImages: v.array(v.id("_storage")),
    rateMin: v.optional(v.number()),
    rateMax: v.optional(v.number()),
    yearsExperience: v.optional(v.number()),
    isVerified: v.boolean(),
    isAvailable: v.boolean(),
    avgRating: v.number(),
    reviewCount: v.number(),
    lat: v.number(),
    lng: v.number(),
    address: v.string(),
    city: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_city", ["city"])
    .index("by_available", ["isAvailable"])
    .index("by_verified", ["isVerified"])
    .searchIndex("search_bio", {
      searchField: "bio",
      filterFields: ["city", "isAvailable", "isVerified"],
    }),

  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_sortOrder", ["sortOrder"]),

  serviceRequests: defineTable({
    clientId: v.id("users"),
    categorySlug: v.string(),
    title: v.string(),
    description: v.string(),
    images: v.array(v.id("_storage")),
    lat: v.number(),
    lng: v.number(),
    address: v.string(),
    city: v.string(),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("urgent")),
    status: v.union(
      v.literal("open"),
      v.literal("in_discussion"),
      v.literal("accepted"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    // Stripe payment state (client -> provider)
    paymentStatus: v.optional(
      v.union(v.literal("unpaid"), v.literal("processing"), v.literal("paid")),
    ),
    paymentQuoteId: v.optional(v.id("quotes")),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    platformFeeCents: v.optional(v.number()),
    providerPayoutCents: v.optional(v.number()),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    acceptedQuoteId: v.optional(v.id("quotes")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_status", ["status"])
    .index("by_categorySlug", ["categorySlug"])
    .index("by_city", ["city"]),

  quotes: defineTable({
    requestId: v.id("serviceRequests"),
    providerId: v.id("users"),
    amount: v.number(),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_providerId", ["providerId"]),

  conversations: defineTable({
    requestId: v.optional(v.id("serviceRequests")),
    participantIds: v.array(v.id("users")),
    lastMessageAt: v.number(),
    lastMessageText: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_lastMessageAt", ["lastMessageAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    otherUserId: v.id("users"),
    unreadCount: v.number(),
    lastReadAt: v.number(),
    lastTypingAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_conversationId_userId", ["conversationId", "userId"])
    .index("by_conversationId", ["conversationId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),

  reviews: defineTable({
    requestId: v.id("serviceRequests"),
    clientId: v.id("users"),
    providerId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_providerId", ["providerId"])
    .index("by_requestId", ["requestId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("new_message"),
      v.literal("new_quote"),
      v.literal("request_update"),
      v.literal("new_review"),
    ),
    title: v.string(),
    body: v.string(),
    data: v.any(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
