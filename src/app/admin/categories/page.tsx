"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Save } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminCategoriesPage() {
  const categories = useQuery(api.categories.listAll, {});
  const upsert = useMutation(api.categories.upsert);
  const reorder = useMutation(api.categories.reorder);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const sorted = useMemo(() => {
    return [...(categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories]);

  function resetForm() {
    setEditingSlug(null);
    setSlug("");
    setName("");
    setIcon("");
    setSortOrder("1");
    setIsActive(true);
  }

  async function onSave() {
    const s = slug.trim().toLowerCase();
    if (!s || !name.trim()) {
      toast.error("Slug and name are required");
      return;
    }
    setIsSaving(true);
    try {
      await upsert({
        slug: s,
        name: name.trim(),
        icon: icon.trim() || "wrench",
        sortOrder: Number(sortOrder) || 1,
        isActive,
      });
      toast.success(editingSlug ? "Updated" : "Added");
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function moveCategory(slugToMove: string, dir: -1 | 1) {
    const list = sorted;
    const idx = list.findIndex((c) => c.slug === slugToMove);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= list.length) return;

    const copy = [...list];
    const tmp = copy[idx];
    copy[idx] = copy[next];
    copy[next] = tmp;

    setIsReordering(true);
    try {
      await reorder({ slugs: copy.map((c) => c.slug) });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reorder");
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold text-white">Categories</h1>
        <p className="mt-1 text-sm text-slate-300">
          Add, edit, and toggle categories.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">
            {editingSlug ? "Edit category" : "Add category"}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={resetForm}
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-slate-300">Slug</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <label className="text-xs font-medium text-slate-300">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-300">Icon</label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="wrench" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-300">Order</label>
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </div>
          <div className="sm:col-span-1">
            <label className="text-xs font-medium text-slate-300">On</label>
            <div className="mt-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-white text-slate-950 hover:bg-slate-100"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-300">
          <div className="col-span-2">Order</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {sorted.map((c) => (
          <div
            key={c._id}
            className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-slate-100"
          >
            <div className="col-span-2 flex items-center gap-2 text-slate-300">
              <span className="w-6">{c.sortOrder}</span>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  onClick={() => moveCategory(c.slug, -1)}
                  disabled={isSaving || isReordering}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  onClick={() => moveCategory(c.slug, 1)}
                  disabled={isSaving || isReordering}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="col-span-3 font-medium">{c.slug}</div>
            <div className="col-span-4 text-slate-300">{c.name}</div>
            <div className="col-span-2">
              {c.isActive ? (
                <Badge variant="success" className="border-emerald-900/30 bg-emerald-900/20 text-emerald-100">
                  Active
                </Badge>
              ) : (
                <Badge variant="muted" className="border-white/10 bg-white/10 text-slate-100">
                  Hidden
                </Badge>
              )}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  setEditingSlug(c.slug);
                  setSlug(c.slug);
                  setName(c.name);
                  setIcon(c.icon);
                  setSortOrder(String(c.sortOrder));
                  setIsActive(c.isActive);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        ))}

        {sorted.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-300">
            No categories yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
