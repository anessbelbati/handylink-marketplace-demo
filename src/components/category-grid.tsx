"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { categoryIconMap, categorySeeds } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { api } from "@convex/_generated/api";

type Category = {
  slug: string;
  name: string;
  icon: string;
};

export function CategoryGrid({ compact = false }: { compact?: boolean }) {
  const fromDb = useQuery(api.categories.listActive, {});

  // Render a seeded fallback so landing pages look complete before seeding.
  const categories: Category[] =
    fromDb && fromDb.length > 0
      ? fromDb.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))
      : categorySeeds.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {categories.map((cat) => {
        const Icon = categoryIconMap[cat.icon];
        return (
          <Link
            key={cat.slug}
            href={`/providers?category=${cat.slug}`}
            className="group glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft transition hover:-translate-y-0.5"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              {Icon ? <Icon className="h-5 w-5" /> : null}
            </span>
            <span className="text-sm font-medium text-slate-900">
              {cat.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
