"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CheckCircle2, MessageSquare, Users } from "lucide-react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/cn";
import { useDemoAuth } from "@/lib/demo-auth";

export default function AdminOverviewPage() {
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;
  const stats = useQuery(api.admin.getAdminStats, { demoClerkId: demoArg });

  const categoryData = useMemo(() => {
    const obj = stats?.requestsByCategory ?? {};
    return Object.entries(obj)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats]);

  if (!stats) {
    return <div className="h-[520px] rounded-3xl border border-white/10 bg-white/5" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Admin overview</h1>
        <p className="mt-1 text-sm text-slate-300">
          Live KPIs and trends powered by Convex.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Total users" value={stats.totalUsers} icon={Users} />
        <Kpi title="Requests today" value={stats.requestsToday} icon={Activity} />
        <Kpi
          title="Completion rate"
          value={`${Math.round(stats.completionRate * 100)}%`}
          icon={CheckCircle2}
        />
        <Kpi
          title="Active conversations"
          value={stats.activeConversations}
          icon={MessageSquare}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white">Signups (14 days)</div>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.signupsByDay}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(2,6,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white">Requests by category</div>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#cbd5e1", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(2,6,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold text-white">Requests (14 days)</div>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.requestsByDay}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2,6,23,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-300">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-white/10")}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
