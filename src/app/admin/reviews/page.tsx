"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { api } from "@convex/_generated/api";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";

export default function AdminReviewsPage() {
  const reviews = useQuery(api.admin.getAllReviews, { limit: 300 });
  const del = useMutation(api.admin.deleteReview);

  async function onDelete(reviewId: string) {
    try {
      await del({
        reviewId: reviewId as any,
      });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Reviews</h1>
        <p className="mt-1 text-sm text-slate-300">
          Moderate reviews and remove flagged content.
        </p>
      </div>

      <div className="space-y-3">
        {(reviews ?? []).map((r) => (
          <div
            key={r.review._id}
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  {r.provider?.fullName ?? "Provider"}{" "}
                  <span className="text-slate-400">←</span>{" "}
                  {r.client?.fullName ?? "Client"}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                  <RatingStars value={r.review.rating} size={12} />
                  <span>{formatTime(r.review.createdAt)}</span>
                </div>
                {r.request ? (
                  <div className="mt-2 text-xs text-slate-300">
                    Request: <span className="font-medium">{r.request.title}</span>
                  </div>
                ) : null}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => onDelete(r.review._id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {r.review.comment ? (
              <div className="mt-3 text-sm text-slate-100">{r.review.comment}</div>
            ) : (
              <div className="mt-3 text-sm text-slate-300">No comment.</div>
            )}
          </div>
        ))}

        {reviews && reviews.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No reviews yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
