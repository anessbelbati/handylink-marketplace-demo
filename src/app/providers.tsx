"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { isDemoAuth } from "@/lib/auth-mode";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  // Keep the error obvious in development and CI logs.
  // Vercel/Next will provide this via env vars in deployed environments.
  console.error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Set it in .env.local or your deployment env vars.",
  );
}

const convex = new ConvexReactClient(convexUrl ?? "");

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (isDemoAuth) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
