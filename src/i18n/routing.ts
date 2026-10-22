import { defineRouting } from "next-intl/routing";

export const locales = ["kk", "ru"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "kk",
  localePrefix: "always",
});
