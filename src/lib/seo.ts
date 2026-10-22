import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface MetaInput {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/topics/exam-anxiety". "" for the home page. */
  path: string;
  title?: string;
  description: string;
  noindex?: boolean;
}

/** Per-page metadata with canonical and hreflang alternates for both languages. */
export function buildMetadata({ locale, path, title, description, noindex }: MetaInput): Metadata {
  const other: Locale = locale === "kk" ? "ru" : "kk";
  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        kk: `/kk${path}`,
        ru: `/ru${path}`,
        "x-default": `/kk${path}`,
      },
    },
    openGraph: {
      title: title ?? "StudentMind",
      description,
      url: `/${locale}${path}`,
      siteName: "StudentMind",
      locale: locale === "kk" ? "kk_KZ" : "ru_RU",
      alternateLocale: other === "kk" ? "kk_KZ" : "ru_RU",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "StudentMind" }],
    },
    twitter: { card: "summary_large_image", title: title ?? "StudentMind", description },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
