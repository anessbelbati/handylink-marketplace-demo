"use client";

import * as React from "react";

export const DEMO_CLERK_ID_COOKIE = "handylink_demo_clerk_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const needle = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(needle)) {
      return decodeURIComponent(trimmed.slice(needle.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  const base = `${encodeURIComponent(name)}=`;
  if (!value) {
    document.cookie = `${base}; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  // 30 days.
  document.cookie = `${base}${encodeURIComponent(value)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function useDemoAuth() {
  const [demoClerkId, setDemoClerkIdState] = React.useState<string | null>(() => {
    const fromCookie = readCookie(DEMO_CLERK_ID_COOKIE);
    if (fromCookie) return fromCookie;
    try {
      const fromStorage = localStorage.getItem(DEMO_CLERK_ID_COOKIE);
      return fromStorage || null;
    } catch {
      return null;
    }
  });

  const setDemoClerkId = React.useCallback((clerkId: string) => {
    writeCookie(DEMO_CLERK_ID_COOKIE, clerkId);
    try {
      localStorage.setItem(DEMO_CLERK_ID_COOKIE, clerkId);
    } catch {
      // ignore
    }
    setDemoClerkIdState(clerkId);
  }, []);

  const clearDemoClerkId = React.useCallback(() => {
    writeCookie(DEMO_CLERK_ID_COOKIE, null);
    try {
      localStorage.removeItem(DEMO_CLERK_ID_COOKIE);
    } catch {
      // ignore
    }
    setDemoClerkIdState(null);
  }, []);

  return {
    demoClerkId,
    setDemoClerkId,
    clearDemoClerkId,
  };
}

