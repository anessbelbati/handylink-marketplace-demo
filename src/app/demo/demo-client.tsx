"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { isDemoAuth } from "@/lib/auth-mode";
import { useDemoAuth } from "@/lib/demo-auth";
import { PublicNav } from "@/components/public-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DemoUser = {
  _id: string;
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: "client" | "provider" | "admin";
  isAdmin: boolean;
};

export default function DemoLoginClient({ redirect }: { redirect: string }) {
  const router = useRouter();

  const { demoClerkId, setDemoClerkId, clearDemoClerkId } = useDemoAuth();
  const [q, setQ] = useState("");

  const users = useQuery(api.users.listDemoUsers, isDemoAuth ? {} : "skip") as
    | DemoUser[]
    | undefined;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = users ?? [];
    if (!term) return rows;
    return rows.filter((u) => {
      return (
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      );
    });
  }, [users, q]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Demo login</CardTitle>
            <CardDescription>
              Select a seeded user to browse the app without Clerk. This is only
              available when `NEXT_PUBLIC_AUTH_MODE=demo` and Convex has
              `ALLOW_DEMO_AUTH=1`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isDemoAuth ? (
              <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-700">
                Demo mode is disabled. Set `NEXT_PUBLIC_AUTH_MODE=demo` in
                `.env.local` and restart the dev server.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, or role"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  clearDemoClerkId();
                }}
                disabled={!demoClerkId}
              >
                Clear selection
              </Button>
            </div>

            <div className="rounded-3xl border bg-white/60 p-2 shadow-soft">
              {users === undefined ? (
                <div className="p-4 text-sm text-slate-600">
                  Loading users...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-sm text-slate-600">No matches.</div>
              ) : (
                <div className="grid gap-2">
                  {filtered.slice(0, 60).map((u) => {
                    const active = demoClerkId === u.clerkId;
                    return (
                      <div
                        key={u.clerkId}
                        className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {u.fullName}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {u.email} | {u.role}
                            {u.isAdmin ? " | admin" : ""}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            clerkId: {u.clerkId}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setDemoClerkId(u.clerkId);
                            router.push(redirect);
                          }}
                          variant={active ? "subtle" : "primary"}
                        >
                          {active ? "Selected" : "Use this user"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-600">
              Tip: Open `/admin` after selecting a user and claim admin access
              using `ADMIN_CLAIM_SECRET`.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

