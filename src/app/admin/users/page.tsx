"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ShieldCheck, Slash, UserCheck, UserX } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");

  const rows = useQuery(api.admin.getUsersOverview, {
    q: q.trim() ? q.trim() : undefined,
    role: role ? (role as any) : undefined,
    limit: 150,
  });

  const toggleStatus = useMutation(api.admin.toggleUserStatus);
  const verifyProvider = useMutation(api.admin.verifyProvider);

  const users = useMemo(() => rows ?? [], [rows]);

  async function onToggleSuspended(userId: string, isSuspended: boolean) {
    try {
      await toggleStatus({
        userId: userId as any,
        isSuspended: !isSuspended,
      });
      toast.success(!isSuspended ? "User suspended" : "User activated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function onToggleVerified(userId: string, next: boolean) {
    try {
      await verifyProvider({
        userId: userId as any,
        isVerified: next,
      });
      toast.success(next ? "Provider verified" : "Verification removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="mt-1 text-sm text-slate-300">
          Search, suspend, and verify providers.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-8">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email..."
          />
        </div>
        <div className="sm:col-span-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <option value="">All roles</option>
            <option value="client">Client</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-300">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {users.map((row) => (
          <div
            key={row.user._id}
            className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-slate-100"
          >
            <div className="col-span-4 min-w-0">
              <div className="truncate font-medium">{row.user.fullName}</div>
              <div className="truncate text-xs text-slate-300">{row.user.email}</div>
            </div>
            <div className="col-span-2">
              <Badge variant="muted" className="border-white/10 bg-white/10 text-slate-100">
                {row.user.role}
              </Badge>
            </div>
            <div className="col-span-2">
              {row.user.isSuspended ? (
                <Badge variant="muted" className="border-white/10 bg-white/10 text-slate-100">
                  Suspended
                </Badge>
              ) : (
                <Badge variant="success" className="border-emerald-900/30 bg-emerald-900/20 text-emerald-100">
                  Active
                </Badge>
              )}
            </div>
            <div className="col-span-2">
              {row.user.role === "provider" && row.providerProfile ? (
                row.providerProfile.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">Unverified</span>
                )
              ) : (
                <span className="text-xs text-slate-400">-</span>
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => onToggleSuspended(row.user._id, row.user.isSuspended)}
                title={row.user.isSuspended ? "Activate" : "Suspend"}
              >
                {row.user.isSuspended ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
              </Button>

              {row.user.role === "provider" && row.providerProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() =>
                    onToggleVerified(
                      row.user._id,
                      !(row.providerProfile?.isVerified ?? false),
                    )
                  }
                  title={(row.providerProfile?.isVerified ?? false) ? "Unverify" : "Verify"}
                >
                  {(row.providerProfile?.isVerified ?? false) ? (
                    <Slash className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        ))}

        {users.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-300">
            No users found.
          </div>
        ) : null}
      </div>
    </div>
  );
}
