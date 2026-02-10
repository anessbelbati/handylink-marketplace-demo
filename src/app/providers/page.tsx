"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Map, Search } from "lucide-react";

import { api } from "@convex/_generated/api";
import { PublicNav } from "@/components/public-nav";
import { ProviderCard } from "@/components/provider-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const ProvidersMap = dynamic(() => import("@/components/providers-map"), {
  ssr: false,
  loading: () => (
    <div className="glass h-[520px] w-full rounded-3xl p-5 shadow-soft">
      <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900/5" />
    </div>
  ),
});

export default function ProvidersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <PublicNav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
            <div className="glass h-[520px] rounded-3xl shadow-soft" />
          </main>
        </div>
      }
    >
      <ProvidersPageInner />
    </Suspense>
  );
}

function ProvidersPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialCategory = sp.get("category") ?? "";
  const initialCity = sp.get("city") ?? "";
  const initialQ = sp.get("q") ?? "";

  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState(initialCity);
  const [q, setQ] = useState(initialQ);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"rating" | "newest">("rating");
  const [mapView, setMapView] = useState(false);

  const [viewerLocation, setViewerLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const categories = useQuery(api.categories.listActive, {});
  const providers = useQuery(api.providers.getProviders, {
    city: city.trim() ? city.trim() : undefined,
    category: category || undefined,
    q: q.trim() ? q.trim() : undefined,
    availableOnly,
    verifiedOnly,
    sort,
    limit: 60,
  });

  const categoryNameBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories ?? []) map[c.slug] = c.name;
    return map;
  }, [categories]);

  useEffect(() => {
    // Ask for location to show distance; ignore errors (user can deny).
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setViewerLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000 },
    );
  }, []);

  function applyFilters() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (city.trim()) params.set("city", city.trim());
    if (q.trim()) params.set("q", q.trim());
    router.replace(`/providers?${params.toString()}`);
  }

  const isLoading = categories === undefined || providers === undefined;
  const count = providers?.length ?? 0;

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">Providers</h1>
            <p className="mt-1 text-sm text-slate-600">
              Filter by category, city, and availability. Results update in real
              time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={mapView ? "outline" : "subtle"}
              size="sm"
              onClick={() => setMapView(false)}
            >
              List
            </Button>
            <Button
              variant={mapView ? "subtle" : "outline"}
              size="sm"
              onClick={() => setMapView(true)}
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
          </div>
        </div>

        <div className="mt-6 glass rounded-3xl p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-12 sm:items-center">
            <div className="sm:col-span-4">
              <label className="text-xs font-medium text-slate-700">
                Search
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, e.g. Ava Bennett"
                />
                <Button variant="outline" onClick={applyFilters}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(
                  "mt-1 h-10 w-full rounded-xl border border-border bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
                )}
              >
                <option value="">All</option>
                {(categories ?? []).map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-slate-700">City</label>
              <Input
                className="mt-1"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-700">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className={cn(
                  "mt-1 h-10 w-full rounded-xl border border-border bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
                )}
              >
                <option value="rating">Top rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                Available only
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                Verified only
              </label>
            </div>

            <div className="text-sm text-slate-600">
              {isLoading ? "Loading..." : `${count} providers`}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="subtle" onClick={applyFilters}>
              Apply filters
            </Button>
          </div>
        </div>

        <div className="mt-8">
          {mapView ? (
            <ProvidersMap
              providers={providers ?? []}
              viewerLocation={viewerLocation}
              categoryNameBySlug={categoryNameBySlug}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(providers ?? []).map((p) => (
                <ProviderCard
                  key={p.user._id}
                  provider={p}
                  categoryNameBySlug={categoryNameBySlug}
                  viewerLocation={viewerLocation}
                />
              ))}
            </div>
          )}

          {!isLoading && count === 0 ? (
            <div className="mt-10 text-center text-sm text-slate-600">
              No providers match your filters. Try removing a filter.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
