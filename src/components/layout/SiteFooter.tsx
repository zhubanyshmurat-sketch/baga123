import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContactView } from "@/lib/content/localize";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { UrgentHelp } from "./UrgentHelp";

const sectionLinks = [
  { href: "/topics", key: "topics" },
  { href: "/tests", key: "tests" },
  { href: "/exercises", key: "exercises" },
  { href: "/articles", key: "articles" },
  { href: "/me", key: "progress" },
] as const;

const projectLinks = [
  { href: "/about", key: "about" },
  { href: "/help", key: "help" },
  { href: "/privacy", key: "privacy" },
] as const;

export function SiteFooter({ contacts }: { contacts: ContactView[] }) {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <footer className="mt-16 border-t border-border bg-surface-2/60 pb-24 lg:pb-0">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <LogoMark size={36} />
            <Wordmark />
          </Link>
          <p className="mt-4 max-w-sm text-muted">{t("about")}</p>
          <div className="mt-5">
            <UrgentHelp contacts={contacts} variant="footer" />
          </div>
        </div>

        <nav aria-label={t("sections")}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{t("sections")}</h2>
          <ul className="space-y-1">
            {sectionLinks.map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-11 items-center hover:text-primary-strong">
                  {tn(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("project")}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{t("project")}</h2>
          <ul className="space-y-1">
            {projectLinks.map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-11 items-center hover:text-primary-strong">
                  {tn(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>{tc("footerDisclaimer")}</p>
          <p>
            {t("noAds")} · {t("rights", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
