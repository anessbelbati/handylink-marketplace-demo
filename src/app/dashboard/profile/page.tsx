"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CreditCard, ImagePlus, LocateFixed, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useDemoAuth } from "@/lib/demo-auth";

const LocationPicker = dynamic(() => import("@/components/location-picker"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full animate-pulse rounded-3xl border bg-white/50" />
  ),
});

export default function ProviderProfilePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const categories = useQuery(api.categories.listActive, {});
  const profile = useQuery(api.providers.getMyProfile, { demoClerkId: demoArg });

  const updateProfile = useMutation(api.providers.updateProviderProfile);
  const addPortfolioImage = useMutation(api.providers.addPortfolioImage);
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const connectStripe = useAction(api.stripe.createConnectOnboardingLink);
  const syncStripe = useAction(api.stripe.syncMyConnectAccount);

  const urls = useQuery(
    api.files.getUrls,
    profile ? { storageIds: profile.portfolioImages } : "skip",
  );

  const [bio, setBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string>("");
  const [rateMin, setRateMin] = useState<string>("");
  const [rateMax, setRateMax] = useState<string>("");
  const [yearsExperience, setYearsExperience] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isStripeActing, setIsStripeActing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setSelectedCategories(profile.categories ?? []);
    setServiceAreas((profile.serviceAreas ?? []).join(", "));
    setRateMin(profile.rateMin ? String(profile.rateMin) : "");
    setRateMax(profile.rateMax ? String(profile.rateMax) : "");
    setYearsExperience(profile.yearsExperience ? String(profile.yearsExperience) : "");
    setIsAvailable(!!profile.isAvailable);
    setAddress(profile.address ?? "");
    setCity(profile.city ?? "");
    setLat(profile.lat ?? null);
    setLng(profile.lng ?? null);
    // Intentionally only sync when the profile identity changes, to avoid overwriting in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id]);

  const canEdit = me?.role === "provider" || me?.isAdmin;

  const stripeAccountId = me?.stripeConnectAccountId ?? null;
  const stripeReady = !!me?.stripeChargesEnabled && !!me?.stripePayoutsEnabled;
  const stripeNeedsOnboarding = !!stripeAccountId && !stripeReady;

  useEffect(() => {
    const status = sp.get("stripe");
    if (!status) return;

    if (status === "refresh") {
      toast("Stripe onboarding not completed yet");
      router.replace("/dashboard/profile");
      return;
    }

    if (status === "return") {
      // Best-effort sync to show status immediately in dev without webhooks.
      (async () => {
        try {
          await syncStripe(demoArg ? { demoClerkId: demoArg } : {});
          toast.success("Stripe connected");
        } catch (e: any) {
          toast.error(e?.message ?? "Failed to sync Stripe status");
        } finally {
          router.replace("/dashboard/profile");
        }
      })();
    }
  }, [demoArg, router, sp, syncStripe]);

  const categoryNameBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories ?? []) map[c.slug] = c.name;
    return map;
  }, [categories]);

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

  async function uploadFile(file: File) {
    const uploadUrl = await generateUploadUrl(
      demoArg ? { demoClerkId: demoArg } : {},
    );
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.storageId as string;
  }

  async function onAddPortfolio(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const storageId = await uploadFile(file);
      await addPortfolioImage({
        demoClerkId: demoArg,
        storageId: storageId as any,
      });
      toast.success("Added image");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add image");
    }
  }

  async function onSave() {
    if (!canEdit) {
      toast.error("Only providers can edit this");
      return;
    }
    if (bio.trim().length < 30) {
      toast.error("Bio should be at least 30 characters");
      return;
    }
    if (!city.trim() || !address.trim()) {
      toast.error("City and address are required");
      return;
    }
    if (selectedCategories.length === 0) {
      toast.error("Select at least one category");
      return;
    }
    if (lat === null || lng === null) {
      toast.error("Set your location");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        demoClerkId: demoArg,
        bio: bio.trim(),
        categories: selectedCategories,
        serviceAreas: serviceAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        rateMin: rateMin ? Number(rateMin) : undefined,
        rateMax: rateMax ? Number(rateMax) : undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        lat,
        lng,
        address: address.trim(),
        city: city.trim(),
        isAvailable,
      });
      toast.success("Profile saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  if (!me || profile === undefined) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (me.role !== "provider" && !me.isAdmin) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Provider profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is only for providers.
        </p>
      </div>
    );
  }

  const portfolioUrls = Object.values(urls ?? {}).filter(Boolean) as string[];

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Your profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your categories, availability, and portfolio. Changes are live.
          </p>
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="text-sm font-semibold text-slate-950">Bio</div>
            <Textarea
              className="mt-2"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your services, what makes you different, your process..."
            />
            <div className="mt-2 text-xs text-slate-500">
              {bio.trim().length} characters
            </div>
          </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Portfolio
                </div>
                <div className="text-xs text-slate-600">
                  Add images of recent work.
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border bg-white/70 px-3 py-2 text-sm shadow-soft hover:bg-white">
                <ImagePlus className="h-4 w-4" />
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAddPortfolio(e.target.files)}
                />
              </label>
            </div>

            {portfolioUrls.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {portfolioUrls.map((u) => (
                  <div
                    key={u}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-white/60 shadow-soft"
                  >
                    <Image
                      src={u}
                      alt="Portfolio"
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                No portfolio images yet.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Payouts (Stripe)
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Connect a Stripe Express account so clients can pay you.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isStripeActing}
                onClick={async () => {
                  setIsStripeActing(true);
                  try {
                    const { url } = await connectStripe({
                      demoClerkId: demoArg,
                      origin: window.location.origin,
                    });
                    window.location.href = url;
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed to start Stripe onboarding");
                    setIsStripeActing(false);
                  }
                }}
              >
                <CreditCard className="h-4 w-4" />
                {!stripeAccountId
                  ? "Connect"
                  : stripeNeedsOnboarding
                    ? "Finish setup"
                    : "Reopen"}
              </Button>
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Status:{" "}
              {!stripeAccountId ? (
                <Badge variant="muted">Not connected</Badge>
              ) : stripeReady ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="warning">Onboarding required</Badge>
              )}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="text-sm font-semibold text-slate-950">Categories</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(categories ?? []).map((c) => {
                const selected = selectedCategories.includes(c.slug);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((cur) =>
                        selected
                          ? cur.filter((x) => x !== c.slug)
                          : [...cur, c.slug],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium shadow-soft transition",
                      selected
                        ? "bg-brand-50 text-brand-700 border-brand-100"
                        : "bg-white/70 text-slate-700 hover:bg-white",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Selected:{" "}
              {selectedCategories.length === 0 ? (
                <span>None</span>
              ) : (
                selectedCategories.map((s) => (
                  <Badge key={s} variant="brand" className="ml-1">
                    {categoryNameBySlug[s] ?? s}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="text-sm font-semibold text-slate-950">
              Service areas
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Comma-separated (used to match requests).
            </div>
            <Input
              className="mt-3"
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
              placeholder="San Francisco, Oakland"
            />
          </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Availability
                </div>
                <div className="text-xs text-slate-600">
                  Toggle to show/hide in browse.
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                <span className="text-slate-700">
                  {isAvailable ? "Available" : "Offline"}
                </span>
              </label>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Location
                </div>
                <div className="text-xs text-slate-600">
                  Used for matching nearby requests.
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onUseMyLocation}>
                <LocateFixed className="h-4 w-4" />
                Use my location
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

              <div className="mt-4">
                <div className="text-xs font-medium text-slate-700">
                  Pick on map (click to drop a pin)
                </div>
                <div className="mt-2">
                  <LocationPicker
                    value={
                      lat !== null && lng !== null ? { lat, lng } : null
                    }
                    onChange={(v) => {
                      setLat(v.lat);
                      setLng(v.lng);
                    }}
                  />
                </div>
              </div>
            </div>

          <div className="glass rounded-3xl p-6 shadow-soft">
            <div className="text-sm font-semibold text-slate-950">Pricing</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Min</label>
                <Input
                  className="mt-1"
                  value={rateMin}
                  inputMode="numeric"
                  onChange={(e) => setRateMin(e.target.value)}
                  placeholder="60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Max</label>
                <Input
                  className="mt-1"
                  value={rateMax}
                  inputMode="numeric"
                  onChange={(e) => setRateMax(e.target.value)}
                  placeholder="140"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Years</label>
                <Input
                  className="mt-1"
                  value={yearsExperience}
                  inputMode="numeric"
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="6"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
