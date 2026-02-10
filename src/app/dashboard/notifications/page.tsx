"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Bell, MessageSquare, Sparkles, Star, Ticket } from "lucide-react";
import { toast } from "sonner";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.getNotifications, { limit: 100 });
  const markRead = useMutation(api.notifications.markNotificationsRead);

  async function onMarkAllRead() {
    try {
      await markRead({});
      toast.success("Marked as read");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            Quotes, messages, status updates, and reviews.
          </p>
        </div>
        <Button variant="outline" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </div>

      <div className="space-y-2">
        {(notifications ?? []).map((n) => {
          const href = linkForNotification(n);
          const Icon = iconForNotification(n.type);
          const row = (
            <div
              className={cn(
                "flex items-start justify-between gap-3 rounded-3xl border bg-white/60 p-5 shadow-soft",
                !n.isRead ? "ring-2 ring-brand-500/20" : "",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950">
                    {n.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{n.body}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {formatTime(n.createdAt)}
                  </div>
                </div>
              </div>

              {!n.isRead ? (
                <div className="mt-1 h-2 w-2 rounded-full bg-brand-600" />
              ) : null}
            </div>
          );

          return href ? (
            <Link key={n._id} href={href} className="block">
              {row}
            </Link>
          ) : (
            <div key={n._id}>{row}</div>
          );
        })}

        {notifications && notifications.length === 0 ? (
          <div className="rounded-3xl border bg-white/60 p-6 text-sm text-slate-600 shadow-soft">
            No notifications yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function linkForNotification(n: any) {
  const data = n.data ?? {};
  if (data.conversationId) return `/dashboard/messages/${data.conversationId}`;
  if (data.requestId) return `/dashboard/requests/${data.requestId}`;
  return null;
}

function iconForNotification(type: string) {
  switch (type) {
    case "new_message":
      return MessageSquare;
    case "new_quote":
      return Ticket;
    case "request_update":
      return Sparkles;
    case "new_review":
      return Star;
    default:
      return Bell;
  }
}

