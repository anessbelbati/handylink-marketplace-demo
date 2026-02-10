"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Briefcase } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatTime } from "@/lib/format";
import { useDemoAuth } from "@/lib/demo-auth";

export default function QuotesPage() {
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const quotes = useQuery(api.quotes.getMyQuotes, { demoClerkId: demoArg });

  if (!me || !quotes) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (me.role !== "provider" && !me.isAdmin) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Quotes</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is only for providers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Quotes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track all submitted quotes and their status.
        </p>
      </div>

      <div className="space-y-3">
        {quotes.map((row) => (
          <Link
            key={row.quote._id}
            href={row.request ? `/dashboard/requests/${row.request._id}` : "#"}
            className="block rounded-3xl border bg-white/60 p-5 shadow-soft hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="text-base font-semibold text-slate-950">
                    {formatMoney(row.quote.amount)}
                  </div>
                  <Badge
                    variant={
                      row.quote.status === "accepted"
                        ? "success"
                        : row.quote.status === "declined"
                          ? "muted"
                          : "warning"
                    }
                  >
                    {row.quote.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {row.request?.title ?? "Request"}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {row.request?.city ?? ""} | {formatTime(row.quote.createdAt)}
                </div>
              </div>

              <div className="text-right text-xs text-slate-600">
                {row.request?.status ? (
                  <span className="capitalize">
                    {row.request.status.replaceAll("_", " ")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-3 text-sm text-slate-700">
              {row.quote.message}
            </div>
          </Link>
        ))}

        {quotes.length === 0 ? (
          <div className="rounded-3xl border bg-white/60 p-6 text-sm text-slate-600 shadow-soft">
            No quotes yet. Browse requests and submit your first quote.
          </div>
        ) : null}
      </div>
    </div>
  );
}
