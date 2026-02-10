"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ImagePlus, LocateFixed, Trash2 } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useDemoAuth } from "@/lib/demo-auth";

type Upload = {
  file: File;
  previewUrl: string;
  storageId?: string;
  isUploading: boolean;
};

export default function NewRequestPage() {
  const router = useRouter();

  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const categories = useQuery(api.categories.listActive, {});

  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const createRequest = useMutation(api.requests.createRequest);

  const [categorySlug, setCategorySlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "urgent">("medium");
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !!categorySlug &&
      title.trim().length >= 6 &&
      description.trim().length >= 20 &&
      !!address.trim() &&
      !!city.trim() &&
      lat !== null &&
      lng !== null
    );
  }, [address, categorySlug, city, description, lat, lng, title]);

  async function onUseMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.success("Location captured");
      },
      () => toast.error("Couldn't get location"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function uploadOne(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.storageId as string;
  }

  async function onAddFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).slice(0, 6);
    const next: Upload[] = list.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isUploading: true,
    }));
    setUploads((u) => [...u, ...next].slice(0, 6));

    // Upload sequentially for predictable rate.
    for (const u of next) {
      try {
        const storageId = await uploadOne(u.file);
        setUploads((cur) =>
          cur.map((x) =>
            x.previewUrl === u.previewUrl
              ? { ...x, storageId, isUploading: false }
              : x,
          ),
        );
      } catch (e: any) {
        setUploads((cur) =>
          cur.map((x) =>
            x.previewUrl === u.previewUrl ? { ...x, isUploading: false } : x,
          ),
        );
        toast.error(e?.message ?? "Upload failed");
      }
    }
  }

  async function onRemoveUpload(previewUrl: string) {
    setUploads((cur) => cur.filter((u) => u.previewUrl !== previewUrl));
  }

  async function onSubmit() {
    if (!me) return;
    if (me.role !== "client" && !me.isAdmin) {
      toast.error("Only clients can post requests");
      return;
    }
    if (!canSubmit) {
      toast.error("Please complete all required fields");
      return;
    }
    if (uploads.some((u) => u.isUploading)) {
      toast.error("Please wait for uploads to finish");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await createRequest({
        demoClerkId: demoArg,
        categorySlug,
        title: title.trim(),
        description: description.trim(),
        images: uploads
          .filter((u) => !!u.storageId)
          .map((u) => u.storageId as any),
        lat: lat!,
        lng: lng!,
        address: address.trim(),
        city: city.trim(),
        urgency,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
      });
      toast.success("Request posted");
      router.push(`/dashboard/requests/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">New request</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add details and photos. Providers can message you instantly.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 shadow-soft">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">
                Category
              </label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className={cn(
                  "mt-1 h-10 w-full rounded-xl border border-border bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
                )}
              >
                <option value="">Select...</option>
                {(categories ?? []).map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Title</label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fix leaking kitchen faucet"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">
                Description
              </label>
              <Textarea
                className="mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue, access details, and timing."
              />
              <div className="mt-1 text-xs text-slate-500">
                {description.trim().length}/20 minimum characters
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className={cn(
                    "mt-1 h-10 w-full rounded-xl border border-border bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Budget min
                </label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="120"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Budget max
                </label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="450"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border bg-white/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    Photos
                  </div>
                  <div className="text-xs text-slate-600">
                    Add up to 6 images.
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border bg-white/70 px-3 py-2 text-sm shadow-soft hover:bg-white">
                  <ImagePlus className="h-4 w-4" />
                  Add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onAddFiles(e.target.files)}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {uploads.map((u) => (
                  <div
                    key={u.previewUrl}
                    className="group relative aspect-square overflow-hidden rounded-2xl border bg-slate-900/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.previewUrl}
                      alt="upload preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/20" />
                    <button
                      type="button"
                      onClick={() => onRemoveUpload(u.previewUrl)}
                      className="absolute right-2 top-2 hidden rounded-xl bg-white/90 p-2 text-slate-800 shadow-soft group-hover:block"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {u.isUploading ? (
                      <div className="absolute inset-0 grid place-items-center bg-white/60 text-xs font-medium text-slate-700">
                        Uploading...
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-white/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    Location
                  </div>
                  <div className="text-xs text-slate-600">
                    Used for matching nearby providers.
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onUseMyLocation}>
                  <LocateFixed className="h-4 w-4" />
                  Use my location
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">
                    Address
                  </label>
                  <Input
                    className="mt-1"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    City
                  </label>
                  <Input
                    className="mt-1"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Lat
                    </label>
                    <Input
                      className="mt-1"
                      value={lat === null ? "" : String(lat.toFixed(6))}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Lng
                    </label>
                    <Input
                      className="mt-1"
                      value={lng === null ? "" : String(lng.toFixed(6))}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
                Post request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
