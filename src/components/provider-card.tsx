"use client";

import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDistanceMiles, haversineMiles } from "@/lib/geo";

export function ProviderCard({
  provider,
  categoryNameBySlug,
  viewerLocation,
}: {
  provider: { user: any; profile: any };
  categoryNameBySlug: Record<string, string>;
  viewerLocation?: { lat: number; lng: number } | null;
}) {
  const { user, profile } = provider;
  const distance =
    viewerLocation && profile?.lat && profile?.lng
      ? formatDistanceMiles(
          haversineMiles(viewerLocation, { lat: profile.lat, lng: profile.lng }),
        )
      : null;

  return (
    <Link
      href={`/providers/${user._id}`}
      className={cn(
        "glass group block rounded-3xl p-5 shadow-soft transition hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} url={user.avatarUrl} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold text-slate-950">
                {user.fullName}
              </div>
              {profile.isVerified ? (
                <span title="Verified">
                  <ShieldCheck className="h-4 w-4 text-brand-700" />
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <RatingStars value={profile.avgRating ?? 0} />
              <span className="text-slate-700">
                {(profile.avgRating ?? 0).toFixed(1)}
              </span>
              <span className="text-slate-400">|</span>
              <span>{profile.reviewCount ?? 0} reviews</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-slate-700">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                profile.isAvailable ? "bg-emerald-500" : "bg-slate-300",
              )}
            />
            {profile.isAvailable ? "Available" : "Offline"}
          </span>
          {distance ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5" />
              {distance}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(profile.categories ?? []).slice(0, 4).map((slug: string) => (
          <Badge key={slug} variant="brand">
            {categoryNameBySlug[slug] ?? slug}
          </Badge>
        ))}
        {(profile.categories ?? []).length > 4 ? (
          <Badge variant="muted">+{profile.categories.length - 4}</Badge>
        ) : null}
      </div>

      <div className="mt-4 text-sm text-slate-700">
        <span className="line-clamp-2">{profile.bio}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
        <span className="capitalize">{profile.city}</span>
        <span>
          {profile.rateMin && profile.rateMax
            ? `$${profile.rateMin}-$${profile.rateMax}/hr`
            : "Custom pricing"}
        </span>
      </div>
    </Link>
  );
}
