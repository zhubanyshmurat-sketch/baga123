import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/** Plain GET form (works without JavaScript) that opens the search page. */
export async function SearchBox({
  locale,
  className,
  defaultValue,
  placeholder,
  action,
  hidden,
}: {
  locale: Locale;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  action?: string;
  hidden?: Record<string, string | undefined>;
}) {
  const t = await getTranslations({ locale, namespace: "search" });
  return (
    <form action={action ?? `/${locale}/search`} role="search" className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only-text">
        {t("title")}
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder ?? t("placeholder")}
        autoComplete="off"
        className="min-h-12 w-full rounded-full border border-border-strong bg-surface py-3 pl-12 pr-28 text-base placeholder:text-muted"
      />
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:brightness-95"
      >
        {t("submit")}
      </button>
    </form>
  );
}
