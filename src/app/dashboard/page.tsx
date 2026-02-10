"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  MessageSquare,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";

import { api } from "@convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/rating-stars";
import { formatTime } from "@/lib/format";

export default function DashboardHome() {
  const me = useQuery(api.users.getMe, {});
  const requests = useQuery(api.requests.getRequests, {});
  const conversations = useQuery(api.conversations.getConversations, {});
  const notificationsUnread = useQuery(api.notifications.getUnreadCount, {});

  const myQuotes = useQuery(
    api.quotes.getMyQuotes,
    me?.role === "provider" ? {} : "skip",
  );
  const myReviews = useQuery(
    api.reviews.getMyReviews,
    me?.role === "provider" ? {} : "skip",
  );

  if (!me || !requests || !conversations || notificationsUnread === undefined) {
    return (
      <div className="grid gap-4">
        <div className="glass h-28 rounded-3xl shadow-soft" />
        <div className="glass h-28 rounded-3xl shadow-soft" />
        <div className="glass h-28 rounded-3xl shadow-soft" />
      </div>
    );
  }

  const openCount = requests.filter((r) => r.status === "open").length;
  const activeCount = requests.filter(
    (r) => r.status === "open" || r.status === "in_discussion" || r.status === "accepted",
  ).length;

  const messageUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount ?? 0),
    0,
  );

  return (
    <div className="grid gap-6">
      <div className="glass rounded-3xl p-6 shadow-glow">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {me.role === "provider" ? "Provider dashboard" : "Client dashboard"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {me.role === "provider"
                ? "Browse nearby requests and turn them into conversations."
                : "Track your requests, compare quotes, and chat with providers."}
            </p>
          </div>
          <Button asChild>
            <Link href={me.role === "provider" ? "/dashboard/requests" : "/dashboard/requests/new"}>
              {me.role === "provider" ? "Browse requests" : "Post a request"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Ticket}
          title={me.role === "provider" ? "Nearby Open" : "Active requests"}
          value={me.role === "provider" ? `${requests.length}` : `${activeCount}`}
          hint={me.role === "provider" ? "Matching your categories" : `${openCount} open`}
          href="/dashboard/requests"
        />
        <KpiCard
          icon={MessageSquare}
          title="Messages"
          value={`${messageUnread}`}
          hint="Unread"
          href="/dashboard/messages"
        />
        <KpiCard
          icon={Bell}
          title="Notifications"
          value={`${notificationsUnread}`}
          hint="Unread"
          href="/dashboard/notifications"
        />
        {me.role === "provider" ? (
          <KpiCard
            icon={Sparkles}
            title="Quotes"
            value={`${(myQuotes ?? []).length}`}
            hint="Submitted"
            href="/dashboard/quotes"
          />
        ) : (
          <KpiCard
            icon={Sparkles}
            title="Completed"
            value={`${requests.filter((r) => r.status === "completed").length}`}
            hint="All time"
            href="/dashboard/requests"
          />
        )}
      </div>

      {me.role === "provider" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent reviews</CardTitle>
              <CardDescription>What clients are saying.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(myReviews ?? []).slice(0, 5).map((r) => (
                <div
                  key={r.review._id}
                  className="rounded-2xl border bg-white/60 p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">
                      {r.client?.fullName ?? "Client"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <RatingStars value={r.review.rating} size={12} />
                      <span>{formatTime(r.review.createdAt)}</span>
                    </div>
                  </div>
                  {r.review.comment ? (
                    <div className="mt-2 text-sm text-slate-700">
                      {r.review.comment}
                    </div>
                  ) : null}
                  {r.request ? (
                    <div className="mt-2 text-xs text-slate-600">
                      Request: {r.request.title}
                    </div>
                  ) : null}
                </div>
              ))}
              {(myReviews ?? []).length === 0 ? (
                <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                  No reviews yet.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open requests</CardTitle>
              <CardDescription>Newest jobs in your area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.slice(0, 6).map((r) => (
                <Link
                  key={r._id}
                  href={`/dashboard/requests/${r._id}`}
                  className="block rounded-2xl border bg-white/60 p-4 shadow-soft hover:bg-white"
                >
                  <div className="text-sm font-semibold text-slate-950">
                    {r.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {r.city} | {r.urgency} | {formatTime(r.createdAt)}
                  </div>
                </Link>
              ))}
              {requests.length === 0 ? (
                <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                  No matching requests right now.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your requests</CardTitle>
            <CardDescription>Most recent activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.slice(0, 8).map((r) => (
              <Link
                key={r._id}
                href={`/dashboard/requests/${r._id}`}
                className="block rounded-2xl border bg-white/60 p-4 shadow-soft hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950">
                    {r.title}
                  </div>
                  <div className="text-xs font-medium text-slate-700 capitalize">
                    {r.status.replaceAll("_", " ")}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {r.city} | {r.urgency} | {formatTime(r.createdAt)}
                </div>
              </Link>
            ))}
            {requests.length === 0 ? (
              <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                No requests yet. Post one to see quotes and messages here.
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
  hint,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="glass group rounded-3xl p-5 shadow-soft transition hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-slate-950">{value}</div>
            <div className="text-xs text-slate-600">{hint}</div>
          </div>
        </div>
        <div className="mt-3 text-sm font-medium text-slate-700">{title}</div>
      </div>
    </Link>
  );
}
