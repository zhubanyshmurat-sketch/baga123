import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface shadow-soft", className)}
      {...props}
    />
  );
}

/** Card that is a link target; the hover lift is disabled for reduced motion via the global rule. */
export const cardLinkClass =
  "group block rounded-card border border-border bg-surface p-5 shadow-soft transition duration-200 " +
  "hover:-translate-y-0.5 hover:border-primary";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "primary" | "accent" | "coral" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    primary: "bg-primary-soft text-primary-strong",
    accent: "bg-accent-soft text-accent-strong",
    coral: "bg-coral-soft text-coral-strong",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
