"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "brand" | "muted" | "success" | "warning";

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/70 text-slate-700 border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  muted: "bg-slate-900/5 text-slate-700 border-border",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-800 border-amber-100",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

