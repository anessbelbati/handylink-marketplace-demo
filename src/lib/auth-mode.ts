export type AuthMode = "clerk" | "demo";

// Client-safe: NEXT_PUBLIC_* env vars are inlined by Next.js at build time.
const raw = process.env.NEXT_PUBLIC_AUTH_MODE;

export const AUTH_MODE: AuthMode = raw === "demo" ? "demo" : "clerk";
export const isDemoAuth = AUTH_MODE === "demo";

