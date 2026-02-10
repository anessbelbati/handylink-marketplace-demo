"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { MapPin, MessageSquare, ShieldCheck } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Avatar } from "@/components/avatar";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/public-nav";
import { formatMoney, formatTime } from "@/lib/format";
import { isDemoAuth } from "@/lib/auth-mode";
import { useDemoAuth } from "@/lib/demo-auth";

function ProviderProfileClientClerk({ userId }: { userId: string }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const me = useQuery(api.users.getMe, {});

  const provider = useQuery(api.providers.getProvider, {
    userId: userId as any,
  });
  const reviews = useQuery(api.reviews.getProviderReviews, {
    providerId: userId as any,
  });
  const startConversation = useMutation(api.conversations.startConversation);

  const providerProfile = provider?.profile;
  const urls = useQuery(
    api.files.getUrls,
    providerProfile ? { storageIds: providerProfile.portfolioImages } : "skip",
  );

  async function onContact() {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    if (me === null) {
      router.push("/onboarding");
      return;
    }
    if (!provider) return;
    const conversationId = await startConversation({
      otherUserId: provider.user._id as any,
    });
    router.push(`/dashboard/messages/${conversationId}`);
  }

  return (
    <ProviderProfileView
      userId={userId}
      provider={provider}
      reviews={reviews}
      urls={urls}
      onContact={onContact}
    />
  );
}

function ProviderProfileClientDemo({ userId }: { userId: string }) {
  const router = useRouter();
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;
  const isSignedIn = !!demoClerkId;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });

  const provider = useQuery(api.providers.getProvider, {
    userId: userId as any,
  });
  const reviews = useQuery(api.reviews.getProviderReviews, {
    providerId: userId as any,
  });
  const startConversation = useMutation(api.conversations.startConversation);

  const providerProfile = provider?.profile;
  const urls = useQuery(
    api.files.getUrls,
    providerProfile ? { storageIds: providerProfile.portfolioImages } : "skip",
  );

  async function onContact() {
    if (!isSignedIn) {
      router.push(`/demo?redirect=/providers/${userId}`);
      return;
    }
    if (me === null) {
      router.push("/demo");
      return;
    }
    if (!provider) return;
    const conversationId = await startConversation({
      demoClerkId: demoArg,
      otherUserId: provider.user._id as any,
    });
    router.push(`/dashboard/messages/${conversationId}`);
  }

  return (
    <ProviderProfileView
      userId={userId}
      provider={provider}
      reviews={reviews}
      urls={urls}
      onContact={onContact}
    />
  );
}

function ProviderProfileView({
  userId,
  provider,
  reviews,
  urls,
  onContact,
}: {
  userId: string;
  provider: any;
  reviews: any;
  urls: any;
  onContact: () => void;
}) {
  const router = useRouter();

  if (provider === undefined) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="glass h-[420px] rounded-3xl p-6 shadow-soft" />
        </main>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
          <div className="glass rounded-3xl p-6 shadow-soft">
            <h1 className="text-2xl font-semibold text-slate-950">
              Provider not found
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This profile may have been removed.
            </p>
            <div className="mt-6">
              <Button href="/providers" variant="outline">
                Back to providers
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const profile = provider.profile;

  const rate =
    profile.rateMin && profile.rateMax
      ? `${formatMoney(profile.rateMin)}-${formatMoney(profile.rateMax)}/hr`
      : "Custom pricing";

  const galleryUrls = Object.values(urls ?? {}).filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="glass overflow-hidden rounded-3xl shadow-glow">
          <div className="relative">
            <div className="h-56 w-full bg-gradient-to-br from-brand-100 via-white to-sky-100" />
            <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_40%_35%,black,transparent)]">
              <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,rgba(15,23,42,0),rgba(15,23,42,0.07),rgba(15,23,42,0))] bg-[length:220%_100%]" />
            </div>

            <div className="absolute left-5 top-5 right-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={provider.user.fullName} url={provider.user.avatarUrl} size={52} />
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-slate-950">
                      {provider.user.fullName}
                    </div>
                    {profile.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                        <ShieldCheck className="h-4 w-4" /> Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <RatingStars value={profile.avgRating ?? 0} />
                    <span className="font-medium">
                      {(profile.avgRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-slate-400">-</span>
                    <span>{profile.reviewCount ?? 0} reviews</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-2 text-xs text-slate-700">
                  <span
                    className={`h-2 w-2 rounded-full ${profile.isAvailable ? "bg-emerald-500" : "bg-slate-300"}`}
                  />
                  {profile.isAvailable ? "Available" : "Offline"}
                </span>
                <Button onClick={onContact}>
                  <MessageSquare className="h-4 w-4" />
                  Contact
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-xl font-semibold text-slate-950">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {profile.bio}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {profile.categories.map((c: string) => (
                  <Badge key={c} variant="brand">
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-950">
                  Portfolio
                </h3>
                {galleryUrls.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galleryUrls.slice(0, 9).map((u) => (
                      <div
                        key={u}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-white/60 shadow-soft"
                      >
                        <Image
                          src={u}
                          alt="Portfolio image"
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                    No portfolio images yet.
                  </div>
                )}
              </div>

              <div className="mt-10">
                <h3 className="text-lg font-semibold text-slate-950">Reviews</h3>
                <div className="mt-3 space-y-3">
                  {(reviews ?? []).slice(0, 12).map((r: any) => (
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
                    </div>
                  ))}

                  {reviews && reviews.length === 0 ? (
                    <div className="rounded-2xl border bg-white/60 p-4 text-sm text-slate-600">
                      No reviews yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className="rounded-3xl border bg-white/60 p-5 shadow-soft">
                <div className="text-sm font-semibold text-slate-950">
                  Service details
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Rate</span>
                    <span className="font-medium">{rate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Experience</span>
                    <span className="font-medium">
                      {profile.yearsExperience ?? 0}+ years
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">City</span>
                    <span className="font-medium">{profile.city}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">Address</span>
                    <span className="text-right font-medium">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.address}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/dashboard/requests/new")}
                  >
                    Post a request
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

export default isDemoAuth ? ProviderProfileClientDemo : ProviderProfileClientClerk;
