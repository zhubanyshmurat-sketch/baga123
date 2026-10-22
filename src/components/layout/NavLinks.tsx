"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation in the header. */
export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("main")} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {navItems.map(({ href, key }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-[0.95rem] font-semibold transition-colors",
                  active
                    ? "bg-primary-soft text-primary-strong"
                    : "text-fg hover:bg-surface-2",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone navigation, fixed to the bottom of the screen. */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mobile")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {navItems.map(({ href, key, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-0.5 text-[0.6875rem] font-semibold transition-colors",
                  active ? "text-primary-strong" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span className="max-w-full truncate">
                  {key === "progress" ? t("progressShort") : t(key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
