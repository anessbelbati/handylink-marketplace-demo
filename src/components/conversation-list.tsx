"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { useDemoAuth } from "@/lib/demo-auth";

export function ConversationList({
  className,
  selectedId,
}: {
  className?: string;
  selectedId?: string;
}) {
  const pathname = usePathname();
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const conversations = useQuery(api.conversations.getConversations, {
    demoClerkId: demoArg,
  });

  if (!conversations) {
    return <div className={cn("glass h-[520px] rounded-3xl shadow-soft", className)} />;
  }

  return (
    <div className={cn("glass rounded-3xl p-3 shadow-soft", className)}>
      <div className="px-2 pb-2 text-sm font-semibold text-slate-950">
        Messages
      </div>
      <div className="space-y-1">
        {conversations.map((c) => {
          const href = `/dashboard/messages/${c.conversation._id}`;
          const active =
            selectedId === c.conversation._id ||
            pathname === href ||
            pathname.startsWith(href);
          return (
            <Link
              key={c.conversation._id}
              href={href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl px-3 py-2 transition",
                active
                  ? "bg-brand-50"
                  : "hover:bg-slate-900/5",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={c.otherUser?.fullName ?? "User"}
                  url={c.otherUser?.avatarUrl}
                  size={40}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">
                    {c.otherUser?.fullName ?? "Unknown"}
                  </div>
                  <div className="truncate text-xs text-slate-600">
                    {c.conversation.lastMessageText ?? "No messages yet"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="text-[11px] text-slate-500">
                  {formatTime(c.conversation.lastMessageAt)}
                </div>
                {c.unreadCount > 0 ? (
                  <div className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                    {c.unreadCount > 99 ? "99+" : c.unreadCount}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}

        {conversations.length === 0 ? (
          <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
            No conversations yet. Contact a provider to start chatting.
          </div>
        ) : null}
      </div>
    </div>
  );
}
