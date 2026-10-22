import { CalendarDays, Hand, NotebookPen, Timer, Wind, type LucideIcon } from "lucide-react";
import type { ExerciseType } from "@/lib/content/types";

const icons: Record<ExerciseType, LucideIcon> = {
  breathing: Wind,
  grounding: Hand,
  diary: NotebookPen,
  planner: CalendarDays,
  pomodoro: Timer,
};

export function ExerciseTypeIcon({ type, className }: { type: ExerciseType; className?: string }) {
  const Icon = icons[type] ?? Wind;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
