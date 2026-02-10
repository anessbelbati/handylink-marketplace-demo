"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Plus } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import { useDemoAuth } from "@/lib/demo-auth";

export default function RequestsPage() {
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const requests = useQuery(api.requests.getRequests, { demoClerkId: demoArg });

  if (!me || !requests) {
    return <div className="glass h-[420px] rounded-3xl shadow-soft" />;
  }

  const title =
    me.role === "provider"
      ? "Open requests"
      : me.role === "admin"
        ? "All requests"
        : "Your requests";

  const subtitle =
    me.role === "provider"
      ? "Requests in your city matching your categories."
      : "Track status, quotes, and messages.";

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        {me.role === "client" ? (
          <Button asChild>
            <Link href="/dashboard/requests/new">
              <Plus className="h-4 w-4" />
              New request
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {requests.map((r) => (
          <Link
            key={r._id}
            href={`/dashboard/requests/${r._id}`}
            className="block rounded-3xl border bg-white/60 p-5 shadow-soft transition hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950">
                  {r.title}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {r.city} | {r.categorySlug}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant={
                    r.status === "completed"
                      ? "success"
                      : r.status === "cancelled"
                        ? "muted"
                        : r.status === "accepted"
                          ? "brand"
                          : r.status === "in_discussion"
                            ? "warning"
                            : "default"
                  }
                >
                  {r.status.replaceAll("_", " ")}
                </Badge>
                <div className="text-xs text-slate-600">
                  {formatTime(r.updatedAt)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span className="capitalize">{r.urgency}</span>
              <span className="inline-flex items-center gap-1 font-medium text-brand-700">
                View details <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}

        {requests.length === 0 ? (
          <div className="rounded-3xl border bg-white/60 p-6 text-sm text-slate-600 shadow-soft">
            {me.role === "provider"
              ? "No matching requests right now. Update your profile categories or check back later."
              : "No requests yet. Create one to receive quotes."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
