import { BookOpen, ChartLine, ClipboardCheck, Compass, Wind, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/topics" | "/tests" | "/exercises" | "/articles" | "/me";
  key: "topics" | "tests" | "exercises" | "articles" | "progress";
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/topics", key: "topics", icon: Compass },
  { href: "/tests", key: "tests", icon: ClipboardCheck },
  { href: "/exercises", key: "exercises", icon: Wind },
  { href: "/articles", key: "articles", icon: BookOpen },
  { href: "/me", key: "progress", icon: ChartLine },
];
