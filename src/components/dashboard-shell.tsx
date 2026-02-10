"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import {
  Bell,
  Briefcase,
  Home,
  LayoutDashboard,
  MessageSquare,
  Shield,
  Star,
  Ticket,
  UserRound,
} from "lucide-react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: (me: any) => boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/requests", label: "Requests", icon: Ticket },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: UserRound,
    show: (me) => me?.role === "provider",
  },
  {
    href: "/dashboard/quotes",
    label: "Quotes",
    icon: Briefcase,
    show: (me) => me?.role === "provider",
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    icon: Star,
    show: (me) => me?.role === "provider",
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    show: (me) => !!me?.isAdmin,
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const me = useQuery(api.users.getMe, {});
  const notificationsUnread = useQuery(api.notifications.getUnreadCount, {});
  const conversations = useQuery(api.conversations.getConversations, {});

  const messageUnread = (conversations ?? []).reduce(
    (acc, c) => acc + (c.unreadCount ?? 0),
    0,
  );

  useEffect(() => {
    if (me === null) router.replace("/onboarding");
  }, [me, router]);

  if (me === undefined) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="glass h-[520px] rounded-3xl shadow-soft" />
      </div>
    );
  }

  if (me === null) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
              H
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-950">
                HandyLink
              </div>
              <div className="text-xs text-slate-600">Dashboard</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {me ? (
              <Badge variant="muted" className="hidden sm:inline-flex">
                {me.role}
              </Badge>
            ) : null}
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
            </SignedIn>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-12">
          <aside className="glass hidden rounded-3xl p-4 shadow-soft md:col-span-3 md:block">
            <nav className="space-y-1">
              {navItems
                .filter((i) => (i.show ? i.show(me) : true))
                .map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  const Icon = item.icon;

                  const badge =
                    item.href === "/dashboard/messages" && messageUnread > 0
                      ? messageUnread
                      : item.href === "/dashboard/notifications" &&
                          (notificationsUnread ?? 0) > 0
                        ? notificationsUnread
                        : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-950",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {badge ? (
                        <span className="min-w-6 rounded-full bg-brand-600 px-2 py-0.5 text-center text-xs text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
            </nav>
          </aside>

          <div className="md:col-span-9">{children}</div>
        </div>
      </div>

      <MobileNav
        me={me}
        notificationsUnread={notificationsUnread ?? 0}
        messageUnread={messageUnread}
      />
    </div>
  );
}

function MobileNav({
  me,
  notificationsUnread,
  messageUnread,
}: {
  me: any;
  notificationsUnread: number;
  messageUnread: number;
}) {
  const pathname = usePathname();

  const items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    show?: boolean;
  }> = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/requests", label: "Requests", icon: Ticket },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
      badge: messageUnread,
    },
    {
      href: "/dashboard/notifications",
      label: "Alerts",
      icon: Bell,
      badge: notificationsUnread,
    },
    {
      href: me?.role === "provider" ? "/dashboard/profile" : "/dashboard",
      label: "Profile",
      icon: UserRound,
      show: me?.role === "provider",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/70 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">
        {items
          .filter((i) => i.show !== false)
          .slice(0, 5)
          .map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = item.badge ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-slate-700",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {badge > 0 ? (
                  <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
