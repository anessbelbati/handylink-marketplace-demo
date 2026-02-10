"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { formatTime } from "@/lib/format";
import { useDemoAuth } from "@/lib/demo-auth";

export default function AdminRequestsPage() {
  const categories = useQuery(api.categories.listAll, {});
  const [status, setStatus] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [city, setCity] = useState("");

  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const requests = useQuery(api.admin.getAllRequests, {
    demoClerkId: demoArg,
    status: status || undefined,
    categorySlug: categorySlug || undefined,
    city: city.trim() ? city.trim() : undefined,
    limit: 300,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Requests</h1>
        <p className="mt-1 text-sm text-slate-300">
          Moderate and filter service requests.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
          >
            <option value="">All</option>
            <option value="open">open</option>
            <option value="in_discussion">in_discussion</option>
            <option value="accepted">accepted</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-300">Category</label>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
          >
            <option value="">All</option>
            {(categories ?? []).map((c) => (
              <option key={c._id} value={c.slug}>
                {c.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-300">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500"
            placeholder="San Francisco"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-300">
          <div className="col-span-5">Title</div>
          <div className="col-span-2">City</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Updated</div>
        </div>

        {(requests ?? []).map((r) => (
          <Link
            key={r._id}
            href={`/dashboard/requests/${r._id}`}
            className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-slate-100 hover:bg-white/5"
          >
            <div className="col-span-5 min-w-0 truncate font-medium">
              {r.title}
            </div>
            <div className="col-span-2 truncate text-slate-300">{r.city}</div>
            <div className="col-span-2 truncate text-slate-300">
              {r.categorySlug}
            </div>
            <div className="col-span-1 truncate text-xs text-slate-300">
              {r.status}
            </div>
            <div className="col-span-2 text-right text-xs text-slate-300">
              {formatTime(r.updatedAt)}
            </div>
          </Link>
        ))}

        {requests && requests.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-300">
            No requests match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
