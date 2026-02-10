"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Shield,
  Users,
} from "lucide-react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/requests", label: "Requests", icon: FolderKanban },
  { href: "/admin/reviews", label: "Reviews", icon: ListChecks },
  { href: "/admin/categories", label: "Categories", icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const me = useQuery(api.users.getMe, {});
  const claimAdmin = useMutation(api.admin.claimAdmin);
  const [secret, setSecret] = React.useState("");
  const [isClaiming, setIsClaiming] = React.useState(false);

  if (me === undefined) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (!me?.isAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="glass rounded-3xl p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">
                Admin access required
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                This area is restricted. If you have the claim secret, enter it
                below.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="ADMIN_CLAIM_SECRET"
              />
            </div>
            <Button
              onClick={async () => {
                setIsClaiming(true);
                try {
                  await claimAdmin({ secret });
                  toast.success("Admin enabled");
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed");
                } finally {
                  setIsClaiming(false);
                }
              }}
              disabled={!secret || isClaiming}
            >
              Claim
            </Button>
          </div>

          <div className="mt-4 text-xs text-slate-600">
            Tip: you can also set `isAdmin` on your user record directly in the
            Convex dashboard for demos.
          </div>

          <div className="mt-6">
            <Button href="/dashboard" variant="outline">
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-12">
        <aside className="md:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.7)]">
            <Link href="/admin" className="mb-4 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-950">
                <Shield className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">HandyLink</div>
                <div className="text-xs text-slate-400">Admin</div>
              </div>
            </Link>

            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-slate-300">{me.email}</div>
              <SignedIn>
                <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
              </SignedIn>
            </div>
          </div>
        </aside>

        <main className="md:col-span-9">{children}</main>
      </div>
    </div>
  );
}
