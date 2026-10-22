import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Analytics } from "@/components/layout/Analytics";
import { PwaRegister } from "@/components/layout/PwaRegister";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BottomNav } from "@/components/layout/NavLinks";
import { routing } from "@/i18n/routing";
import { getHelpContacts } from "@/lib/content";
import { localizeContact } from "@/lib/content/localize";
import { siteUrl } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `StudentMind — ${t("tagline")}`, template: "%s · StudentMind" },
    description: t("tagline"),
    applicationName: "StudentMind",
    appleWebApp: { capable: true, title: "StudentMind", statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1424" },
  ],
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [messages, t, contacts] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: "common" }),
    getHelpContacts(),
  ]);
  // The admin strings are only needed in the admin area, which provides them itself.
  const { admin: _admin, ...clientMessages } = messages as Record<string, unknown>;
  void _admin;
  const contactViews = contacts.map((c) => localizeContact(c, locale));

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider messages={clientMessages}>
          <SessionProvider>
            <a
              href="#main"
              className="sr-only-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-on-primary"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader contacts={contactViews} />
            <main id="main" className="flex-1 pb-24 lg:pb-0">
              {children}
            </main>
            <SiteFooter contacts={contactViews} />
            <BottomNav />
            <PwaRegister />
          </SessionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
