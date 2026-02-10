import type { AuthConfig } from "convex/server";

// Clerk requires a JWT template named "convex".
// In Clerk Dashboard: JWT Templates -> New template -> Name: convex -> Audience: convex
const clerkIssuerUrl = process.env.CLERK_ISSUER_URL;

export default {
  providers: clerkIssuerUrl
    ? [
        {
          domain: clerkIssuerUrl,
          applicationID: "convex",
        },
      ]
    : [],
} satisfies AuthConfig;

