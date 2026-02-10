"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[110px] w-full resize-y rounded-2xl border border-border bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-soft placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

