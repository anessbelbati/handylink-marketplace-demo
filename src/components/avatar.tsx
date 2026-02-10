import Image from "next/image";

import { cn } from "@/lib/cn";

export function Avatar({
  name,
  url,
  size = 40,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white/60 text-slate-800 shadow-soft",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {url ? (
        <Image
          src={url}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold">
          {initials || "?"}
        </div>
      )}
    </div>
  );
}

