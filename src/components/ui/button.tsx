"use client";

import * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "outline" | "ghost" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-soft border border-transparent",
  outline:
    "bg-white/70 hover:bg-white border border-border text-slate-900 shadow-soft",
  ghost: "hover:bg-slate-900/5 text-slate-900",
  subtle:
    "bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-100",
  danger: "bg-rose-600 hover:bg-rose-700 text-white border border-transparent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-11 px-5 text-base rounded-2xl",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      href,
      className,
      variant = "primary",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const classes = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-50",
      sizes[size],
      variants[variant],
      className,
    );

    if (href) {
      return (
        <Link
          href={href}
          className={classes}
          // @ts-expect-error Link doesn't accept button ref; fine for styling-only usage.
          ref={ref}
        >
          {props.children}
        </Link>
      );
    }

    return <Comp ref={ref} className={classes} {...props} />;
  },
);
Button.displayName = "Button";

