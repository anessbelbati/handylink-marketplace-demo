"use client";

import { useAction, useQuery } from "convex/react";
import { CreditCard, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import { api } from "@convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoAuth } from "@/lib/demo-auth";

export default function BillingPage() {
  const sp = useSearchParams();

  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const billing = useQuery(api.billing.getMyPlan, { demoClerkId: demoArg });

  const createCheckout = useAction(api.billing.createProCheckout);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sp.get("success") === "1") {
      toast.success("Checkout complete. Your plan will update shortly.");
    }
  }, [sp]);

  if (!me || !billing) {
    return <div className="glass h-[520px] rounded-3xl shadow-soft" />;
  }

  if (me.role !== "provider" && !me.isAdmin) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Billing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Billing is only relevant for providers.
        </p>
      </div>
    );
  }

  const isPro = billing.plan === "pro";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upgrade to Pro to get more leads and a featured badge.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Current plan
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Managed via Polar (sandbox/production).
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant={isPro ? "success" : "muted"}>
                {isPro ? (
                  <>
                    <Crown className="h-3.5 w-3.5" />
                    Pro
                  </>
                ) : (
                  "Free"
                )}
              </Badge>
              {billing.planUpdatedAt ? (
                <span className="text-xs text-slate-500">
                  Updated {new Date(billing.planUpdatedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {!isPro ? (
            <Button
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  const { url } = await createCheckout({
                    demoClerkId: demoArg,
                    origin: window.location.origin,
                  });
                  window.location.href = url;
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed to start checkout");
                  setIsLoading(false);
                }
              }}
            >
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          ) : (
            <Badge variant="success">You are Pro</Badge>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-slate-700 shadow-soft">
            Featured badge on your profile and cards
          </div>
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-slate-700 shadow-soft">
            Higher visibility in provider search (optional)
          </div>
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-slate-700 shadow-soft">
            Priority request alerts (optional)
          </div>
          <div className="rounded-3xl border bg-white/60 p-4 text-sm text-slate-700 shadow-soft">
            Early access to new features
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          If checkout fails, ensure Convex env vars are set: POLAR_ACCESS_TOKEN,
          POLAR_PRO_PRODUCT_ID, POLAR_WEBHOOK_SECRET, POLAR_SERVER.
        </div>
      </div>
    </div>
  );
}

