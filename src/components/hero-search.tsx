"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { MapPin, Search } from "lucide-react";

import { api } from "@convex/_generated/api";
import { categorySeeds } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName = cn(
  "h-10 w-full rounded-xl border border-border bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
);

export function HeroSearch() {
  const router = useRouter();

  const fromDb = useQuery(api.categories.listActive, {});
  const categories = useMemo(() => {
    const list = fromDb && fromDb.length > 0 ? fromDb : categorySeeds;
    return list.map((c) => ({ slug: c.slug, name: c.name }));
  }, [fromDb]);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

  function go() {
    const params = new URLSearchParams();
    const qTrim = q.trim();
    const cityTrim = city.trim();

    if (qTrim) params.set("q", qTrim);
    if (cityTrim) params.set("city", cityTrim);
    if (category) params.set("category", category);

    const qs = params.toString();
    router.push(qs ? `/providers?${qs}` : "/providers");
  }

  return (
    <div className="mt-7 glass rounded-3xl p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Search providers
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Category, city, and keyword search. Results update live.
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-700">Keyword</label>
          <Input
            className="mt-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or bio"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                go();
              }
            }}
          />
        </div>

        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-700">Category</label>
          <select
            className={cn("mt-1", selectClassName)}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="text-xs font-medium text-slate-700">City</label>
          <div className="mt-1 relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  go();
                }
              }}
            />
          </div>
        </div>

        <div className="sm:col-span-1">
          <Button
            className="w-full"
            onClick={go}
            aria-label="Search providers"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

