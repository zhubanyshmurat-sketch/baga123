import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "coral" | "danger";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors duration-200 " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-95 active:brightness-90",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-2",
  soft: "bg-primary-soft text-primary-strong hover:brightness-95",
  ghost: "text-fg hover:bg-surface-2",
  coral: "bg-coral text-on-coral hover:brightness-95 active:brightness-90",
  danger: "border border-coral-strong bg-coral-soft text-coral-strong hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-11 px-5 text-[0.95rem]",
  lg: "min-h-12 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
