import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryGrid } from "@/components/category-grid";
import { HeroSearch } from "@/components/hero-search";
import { PublicNav } from "@/components/public-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <section className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1 text-sm text-slate-700 shadow-soft">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Real-time marketplace demo
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Hire local pros without the back-and-forth.
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-700 sm:text-lg">
              Post a job, get quotes, chat in real time, and book the right
              provider. Built end-to-end with Next.js + Convex + Clerk.
            </p>

            <HeroSearch />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/providers">
                  Browse providers <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard/requests/new">Post a request</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-2xl p-4 shadow-soft">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-slate-900">
                  Instant quotes
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Providers respond fast. No waiting on email threads.
                </div>
              </div>
              <div className="glass rounded-2xl p-4 shadow-soft">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-slate-900">
                  Verified pros
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Admin verification and review signals built-in.
                </div>
              </div>
              <div className="glass rounded-2xl p-4 shadow-soft">
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <span className="text-sm font-semibold">Live</span>
                </div>
                <div className="text-sm font-medium text-slate-900">
                  Real-time chat
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Messaging + notifications update instantly.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass relative overflow-hidden rounded-3xl p-5 shadow-glow">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-100 blur-3xl" />
              <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
              <div className="relative">
                <div className="text-sm font-medium text-slate-900">
                  Popular categories
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Tap a category to browse providers.
                </p>

                <div className="mt-4">
                  <CategoryGrid compact />
                </div>

                <div className="mt-6 rounded-2xl border bg-white/60 p-4">
                  <div className="text-sm font-medium text-slate-900">
                    How it works
                  </div>
                  <ol className="mt-2 space-y-2 text-sm text-slate-700">
                    <li>1. Post a request (photos + location).</li>
                    <li>2. Receive quotes and chat instantly.</li>
                    <li>3. Accept, complete, and leave a review.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border bg-white/60 p-4 text-sm text-slate-700 shadow-soft">
              <span>
                Want the full workflow? Sign in and use the dashboard.
              </span>
              <Link
                href="/login"
                className="font-medium text-brand-700 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
