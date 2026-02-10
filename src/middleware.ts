import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
const isDemoMode = authMode === "demo";
const DEMO_CLERK_ID_COOKIE = "handylink_demo_clerk_id";

const isPublicRoute = createRouteMatcher([
  "/",
  "/providers(.*)",
  "/login(.*)",
  "/register(.*)",
  "/demo(.*)",
]);

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);

const clerk = clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    // Keep auth redirects on our app routes (instead of Clerk-hosted pages),
    // so local dev keeps working even if Clerk's dev domain is unreachable.
    signInUrl: "/login",
    signUpUrl: "/register",
  },
);

function demoMiddleware(req: NextRequest) {
  if (isProtectedRoute(req)) {
    const demoId = req.cookies.get(DEMO_CLERK_ID_COOKIE)?.value;
    if (!demoId) {
      const url = req.nextUrl.clone();
      url.pathname = "/demo";
      url.searchParams.set("redirect", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export default isDemoMode ? demoMiddleware : clerk;

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|.*\\..*).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
