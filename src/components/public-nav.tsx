"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function PublicNav({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 border-b bg-white/50 backdrop-blur", className)}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft transition group-hover:translate-y-[-1px]">
            H
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-950">HandyLink</div>
            <div className="text-xs text-slate-600">Service marketplace</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-700 sm:flex">
          <Link href="/providers" className="hover:text-slate-950">
            Providers
          </Link>
          <Link href="/dashboard" className="hover:text-slate-950">
            Dashboard
          </Link>
          <Link href="/admin" className="hover:text-slate-950">
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <SignedOut>
            <Button href="/login" variant="outline" size="sm">
              Sign in
            </Button>
            <Button href="/register" size="sm">
              Create account
            </Button>
          </SignedOut>
          <SignedIn>
            <Button href="/dashboard" variant="outline" size="sm">
              Open dashboard
            </Button>
            <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

