"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Briefcase, UserRound } from "lucide-react";

import { api } from "@convex/_generated/api";
import { PublicNav } from "@/components/public-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { isDemoAuth } from "@/lib/auth-mode";
import { useDemoAuth } from "@/lib/demo-auth";

type Role = "client" | "provider";

function OnboardingClerkPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const me = useQuery(api.users.getMe, {});
  const registerUser = useMutation(api.users.registerUser);

  const [role, setRole] = useState<Role>("client");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userInfo = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const fullName =
      user?.fullName ??
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
      "";
    const avatarUrl = user?.imageUrl ?? undefined;
    return { email, fullName, avatarUrl };
  }, [user]);

  useEffect(() => {
    if (me) {
      router.replace("/dashboard");
    }
  }, [me, router]);

  async function onContinue() {
    if (!isLoaded) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!userInfo.email || !userInfo.fullName) {
      toast.error("Please finish setting up your Clerk profile first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({
        role,
        email: userInfo.email,
        fullName: userInfo.fullName,
        avatarUrl: userInfo.avatarUrl,
      });
      toast.success("Account ready");
      router.replace(role === "provider" ? "/dashboard/profile" : "/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="glass rounded-3xl p-6 shadow-glow sm:p-8">
          <h1 className="text-3xl font-semibold text-slate-950">
            Choose your role
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You can browse everything, but your dashboard experience depends on
            whether you post jobs or provide services.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RoleCard
              title="Client"
              description="Post service requests, compare quotes, message providers."
              icon={UserRound}
              selected={role === "client"}
              onClick={() => setRole("client")}
            />
            <RoleCard
              title="Provider"
              description="Create a profile, get matched to nearby requests, send quotes."
              icon={Briefcase}
              selected={role === "provider"}
              onClick={() => setRole("provider")}
            />
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Signed in as{" "}
              <span className="font-medium text-slate-900">
                {userInfo.email || "..."}
              </span>
            </div>
            <Button size="lg" onClick={onContinue} disabled={isSubmitting}>
              Continue
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function OnboardingDemoPage() {
  const router = useRouter();
  const { demoClerkId } = useDemoAuth();

  useEffect(() => {
    if (demoClerkId) router.replace("/dashboard");
  }, [demoClerkId, router]);

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="glass rounded-3xl p-6 shadow-glow sm:p-8">
          <h1 className="text-3xl font-semibold text-slate-950">
            Demo mode
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Onboarding is skipped when `NEXT_PUBLIC_AUTH_MODE=demo`. Select a
            seeded user to continue.
          </p>

          <div className="mt-6">
            <Button href="/demo" size="lg">
              Go to demo login
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default isDemoAuth ? OnboardingDemoPage : OnboardingClerkPage;

function RoleCard({
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "glass group w-full rounded-3xl p-5 text-left shadow-soft transition hover:-translate-y-0.5",
        selected ? "ring-2 ring-brand-500/40" : "ring-0",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
      </div>
    </button>
  );
}
