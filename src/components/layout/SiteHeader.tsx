import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContactView } from "@/lib/content/localize";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { AuthButton } from "./AuthButton";
import { LangSwitch } from "./LangSwitch";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { UrgentHelp } from "./UrgentHelp";

export function SiteHeader({ contacts }: { contacts: ContactView[] }) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2" aria-label="StudentMind">
          <LogoMark size={36} />
          <span className="hidden min-[420px]:inline lg:hidden xl:inline">
            <Wordmark />
          </span>
        </Link>

        <NavLinks />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            aria-label={t("search")}
            title={t("search")}
            className="hidden size-11 items-center justify-center rounded-full transition-colors hover:bg-surface-2 sm:inline-flex lg:hidden xl:inline-flex"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <LangSwitch />
          <ThemeToggle />
          <AuthButton />
          <UrgentHelp contacts={contacts} />
        </div>
      </div>
    </header>
  );
}
