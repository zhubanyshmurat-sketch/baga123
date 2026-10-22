import type { Level } from "@/lib/content/types";
import { cn } from "@/lib/utils";

const order: Level[] = ["low", "medium", "high"];

/** Three-step scale. The active step is marked by fill AND position, never by colour alone. */
export function LevelMeter({ level, label }: { level: Level; label: string }) {
  const active = order.indexOf(level);
  return (
    <div role="img" aria-label={label} className="flex gap-1.5">
      {order.map((l, i) => (
        <span
          key={l}
          className={cn(
            "h-3 flex-1 rounded-full",
            i <= active ? "bg-primary" : "bg-surface-2",
            i === active && "ring-2 ring-primary-strong ring-offset-2 ring-offset-surface",
          )}
        />
      ))}
    </div>
  );
}
