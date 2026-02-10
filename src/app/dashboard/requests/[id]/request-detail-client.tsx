"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Check, MessageSquare, Star, X } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Avatar } from "@/components/avatar";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatTime } from "@/lib/format";

export default function RequestDetailClient({ requestId }: { requestId: string }) {
  const router = useRouter();

  const me = useQuery(api.users.getMe, {});
  const data = useQuery(api.requests.getRequest, {
    requestId: requestId as any,
  });

  const respondToQuote = useMutation(api.quotes.respondToQuote);
  const submitQuote = useMutation(api.quotes.submitQuote);
  const updateStatus = useMutation(api.requests.updateRequestStatus);
  const startConversation = useMutation(api.conversations.startConversation);
  const createReview = useMutation(api.reviews.createReview);

  const urls = useQuery(
    api.files.getUrls,
    data?.request ? { storageIds: data.request.images } : "skip",
  );

  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isActing, setIsActing] = useState(false);

  const isClientView = !!(me && data?.request && me._id === data.request.clientId);
  const canQuote = useMemo(() => {
    if (!me || !data?.request) return false;
    if (me.role !== "provider" && !me.isAdmin) return false;
    const status = data.request.status;
    if (status === "cancelled" || status === "completed") return false;
    return true;
  }, [data?.request, me]);

  async function onRespondQuote(quoteId: string, status: "accepted" | "declined") {
    setIsActing(true);
    try {
      await respondToQuote({
        quoteId: quoteId as any,
        status,
      });
      toast.success(status === "accepted" ? "Quote accepted" : "Quote declined");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setIsActing(false);
    }
  }

  async function onSubmitQuote() {
    if (!canQuote || !data?.request) return;
    const amount = Number(quoteAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (quoteMessage.trim().length < 10) {
      toast.error("Add a short message");
      return;
    }

    setIsActing(true);
    try {
      await submitQuote({
        requestId: data.request._id as any,
        amount,
        message: quoteMessage.trim(),
      });
      toast.success("Quote sent");
      setQuoteAmount("");
      setQuoteMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit quote");
    } finally {
      setIsActing(false);
    }
  }

  async function onUpdateStatus(status: any) {
    if (!data?.request) return;
    setIsActing(true);
    try {
      await updateStatus({
        requestId: data.request._id as any,
        status,
      });
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setIsActing(false);
    }
  }

  async function onMessageUser(otherUserId: string) {
    if (!data?.request) return;
    try {
      const cid = await startConversation({
        otherUserId: otherUserId as any,
        requestId: data.request._id as any,
      });
      router.push(`/dashboard/messages/${cid}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start conversation");
    }
  }

  async function onSubmitReview() {
    if (!data?.request) return;
    if (reviewRating < 1 || reviewRating > 5) {
      toast.error("Select a rating");
      return;
    }

    setIsActing(true);
    try {
      await createReview({
        requestId: data.request._id as any,
        rating: reviewRating,
        comment: reviewComment.trim() ? reviewComment.trim() : undefined,
      });
      toast.success("Review submitted");
      setReviewComment("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit review");
    } finally {
      setIsActing(false);
    }
  }

  if (!me || data === undefined) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (!data) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-xl font-semibold text-slate-950">Not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          This request may have been removed.
        </p>
        <div className="mt-6">
          <Button href="/dashboard/requests" variant="outline">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const { request, client, quotes, review } = data;

  const imageUrls = Object.values(urls ?? {}).filter(Boolean) as string[];
  const accepted = quotes.find((q) => q.quote.status === "accepted");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-950">{request.title}</h1>
            <Badge
              variant={
                request.status === "completed"
                  ? "success"
                  : request.status === "cancelled"
                    ? "muted"
                    : request.status === "accepted"
                      ? "brand"
                      : request.status === "in_discussion"
                        ? "warning"
                        : "default"
              }
            >
              {request.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="mt-2 text-sm text-slate-700">
            {request.city} | {request.categorySlug} | {request.urgency} |{" "}
            <span className="text-slate-600">{formatTime(request.createdAt)}</span>
          </div>
        </div>

        {isClientView ? (
          <div className="flex flex-wrap gap-2">
            {request.status === "accepted" ? (
              <Button
                variant="subtle"
                onClick={() => onUpdateStatus("completed")}
                disabled={isActing}
              >
                Mark completed
              </Button>
            ) : null}
            {request.status !== "cancelled" && request.status !== "completed" ? (
              <Button
                variant="outline"
                onClick={() => onUpdateStatus("cancelled")}
                disabled={isActing}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="text-sm font-semibold text-slate-950">Details</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {request.description}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white/60 p-4">
                <div className="text-xs text-slate-600">Budget</div>
                <div className="mt-1 text-sm font-medium text-slate-950">
                  {request.budgetMin && request.budgetMax
                    ? `${formatMoney(request.budgetMin)}-${formatMoney(request.budgetMax)}`
                    : "Not specified"}
                </div>
              </div>
              <div className="rounded-2xl border bg-white/60 p-4">
                <div className="text-xs text-slate-600">Address</div>
                <div className="mt-1 text-sm font-medium text-slate-950">
                  {request.address}
                </div>
              </div>
            </div>

            {imageUrls.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imageUrls.map((u) => (
                  <div
                    key={u}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-white/60 shadow-soft"
                  >
                    <Image
                      src={u}
                      alt="Request photo"
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {me.role === "provider" ? (
            <div className="glass rounded-3xl p-6 shadow-soft">
              <div className="text-sm font-semibold text-slate-950">Client</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={client?.fullName ?? "Client"} url={client?.avatarUrl} size={44} />
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {client?.fullName ?? "Client"}
                    </div>
                    <div className="text-xs text-slate-600">{client?.email ?? ""}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onMessageUser(request.clientId)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          ) : null}

          {isClientView && request.status === "completed" ? (
            <div className="glass rounded-3xl p-6 shadow-soft">
              <div className="text-sm font-semibold text-slate-950">Review</div>
              <div className="mt-1 text-xs text-slate-600">
                {accepted?.provider?.fullName
                  ? `Share feedback for ${accepted.provider.fullName}.`
                  : "This request has no accepted provider."}
              </div>

              {review ? (
                <div className="mt-4 rounded-2xl border bg-white/60 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-950">
                      Submitted
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <RatingStars value={review.rating} size={12} />
                      <span>{formatTime(review.createdAt)}</span>
                    </div>
                  </div>
                  {review.comment ? (
                    <div className="mt-2 text-sm text-slate-700">{review.comment}</div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-600">No comment.</div>
                  )}
                </div>
              ) : accepted?.provider ? (
                <div className="mt-4 rounded-2xl border bg-white/60 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={accepted.provider.fullName ?? "Provider"}
                        url={accepted.provider.avatarUrl}
                        size={40}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {accepted.provider.fullName ?? "Provider"}
                        </div>
                        <div className="text-xs text-slate-600">
                          Rate the experience
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const v = i + 1;
                      const active = reviewRating >= v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setReviewRating(v)}
                          className="grid h-9 w-9 place-items-center rounded-xl border bg-white/70 shadow-soft hover:bg-white disabled:opacity-60"
                          aria-label={`${v} star${v === 1 ? "" : "s"}`}
                          disabled={isActing}
                        >
                          <Star
                            className={
                              active
                                ? "h-4 w-4 fill-amber-400 text-amber-500"
                                : "h-4 w-4 text-slate-400"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-medium text-slate-700">
                      Comment (optional)
                    </label>
                    <Textarea
                      className="mt-1"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="What went well? Anything to improve?"
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={onSubmitReview} disabled={isActing}>
                      Submit review
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                  No accepted provider to review.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-950">
                {isClientView ? "Quotes" : "Your quote"}
              </div>
              <div className="text-xs text-slate-600">{quotes.length} total</div>
            </div>

            {isClientView ? (
              <div className="mt-4 space-y-3">
                {quotes.map((q) => (
                  <div key={q.quote._id} className="rounded-2xl border bg-white/60 p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={q.provider?.fullName ?? "Provider"}
                          url={q.provider?.avatarUrl}
                          size={40}
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {q.provider?.fullName ?? "Provider"}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                            {q.providerProfile ? (
                              <>
                                <RatingStars value={q.providerProfile.avgRating ?? 0} size={12} />
                                <span>{(q.providerProfile.avgRating ?? 0).toFixed(1)}</span>
                                <span className="text-slate-400">|</span>
                              </>
                            ) : null}
                            <span>{formatTime(q.quote.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-semibold text-slate-950">
                          {formatMoney(q.quote.amount)}
                        </div>
                        <div className="mt-1 text-xs font-medium capitalize text-slate-700">
                          {q.quote.status}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-700">
                      {q.quote.message}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMessageUser(q.quote.providerId)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>

                      {q.quote.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => onRespondQuote(q.quote._id, "accepted")}
                            disabled={isActing}
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRespondQuote(q.quote._id, "declined")}
                            disabled={isActing}
                          >
                            <X className="h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {quotes.length === 0 ? (
                  <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                    No quotes yet. Providers will message you when they respond.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {quotes.length > 0 ? (
                  quotes.map((q) => (
                    <div key={q.quote._id} className="rounded-2xl border bg-white/60 p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {formatMoney(q.quote.amount)}
                          </div>
                          <div className="mt-1 text-xs font-medium capitalize text-slate-700">
                            {q.quote.status}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600">
                          {formatTime(q.quote.createdAt)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{q.quote.message}</div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => onMessageUser(request.clientId)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message client
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border bg-white/60 p-4 shadow-soft">
                    <div className="text-sm font-semibold text-slate-950">
                      Send a quote
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-slate-700">
                          Amount
                        </label>
                        <Input
                          className="mt-1"
                          inputMode="numeric"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          placeholder="250"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-700">
                          Message
                        </label>
                        <Textarea
                          className="mt-1"
                          value={quoteMessage}
                          onChange={(e) => setQuoteMessage(e.target.value)}
                          placeholder="Timeline, what's included, questions..."
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={onSubmitQuote} disabled={!canQuote || isActing}>
                        Send quote
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
