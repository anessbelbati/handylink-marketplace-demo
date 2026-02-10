"use client";

import { useQuery } from "convex/react";
import { Star } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Avatar } from "@/components/avatar";
import { RatingStars } from "@/components/rating-stars";
import { formatTime } from "@/lib/format";

export default function ReviewsPage() {
  const me = useQuery(api.users.getMe, {});
  const reviews = useQuery(api.reviews.getMyReviews, {});

  if (!me || !reviews) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (me.role !== "provider" && !me.isAdmin) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Reviews</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is only for providers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Reviews</h1>
        <p className="mt-1 text-sm text-slate-600">
          Recent reviews from clients.
        </p>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.review._id}
            className="rounded-3xl border bg-white/60 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={r.client?.fullName ?? "Client"} url={r.client?.avatarUrl} size={40} />
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {r.client?.fullName ?? "Client"}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <RatingStars value={r.review.rating} size={12} />
                    <span>{formatTime(r.review.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                <Star className="h-5 w-5" />
              </div>
            </div>

            {r.review.comment ? (
              <div className="mt-3 text-sm text-slate-700">{r.review.comment}</div>
            ) : null}

            {r.request ? (
              <div className="mt-3 text-xs text-slate-600">
                Request: <span className="font-medium">{r.request.title}</span>
              </div>
            ) : null}
          </div>
        ))}

        {reviews.length === 0 ? (
          <div className="rounded-3xl border bg-white/60 p-6 text-sm text-slate-600 shadow-soft">
            No reviews yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

