import { Star } from "lucide-react";

import { cn } from "@/lib/cn";

export function RatingStars({
  value,
  className,
  size = 14,
}: {
  value: number;
  className?: string;
  size?: number;
}) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const total = 5;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < full;
        const isHalf = !filled && half && i === full;
        return (
          <span key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              className={cn(
                "absolute left-0 top-0 h-full w-full text-slate-300",
              )}
              fill="currentColor"
            />
            {(filled || isHalf) ? (
              <span
                className="absolute left-0 top-0 h-full overflow-hidden text-amber-500"
                style={{ width: isHalf ? `${size / 2}px` : `${size}px` }}
              >
                <Star className="h-full w-full" fill="currentColor" />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

