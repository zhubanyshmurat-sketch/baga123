import {
  BookOpen,
  CalendarClock,
  Compass,
  Flame,
  GraduationCap,
  Heart,
  Moon,
  Sparkles,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  flame: Flame,
  "calendar-clock": CalendarClock,
  users: Users,
  moon: Moon,
  compass: Compass,
  sparkles: Sparkles,
  wind: Wind,
  "book-open": BookOpen,
  heart: Heart,
};

export const ICON_NAMES = Object.keys(icons);

export function TopicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Heart;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
