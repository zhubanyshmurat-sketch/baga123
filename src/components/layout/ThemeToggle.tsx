"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  THEME_EVENT,
  readThemePref,
  resolveTheme,
  saveThemePref,
  applyTheme,
} from "@/lib/theme";

export function ThemeToggle() {
  const t = useTranslations("header");
  // null until mounted: the server cannot know the visitor's theme.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const sync = () => setTheme(resolveTheme(readThemePref()));
    sync();
    window.addEventListener(THEME_EVENT, sync);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readThemePref() === "system") {
        applyTheme("system");
        sync();
      }
    };
    media.addEventListener("change", onSystemChange);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = `${t("theme")}: ${theme === "dark" ? t("themeDark") : t("themeLight")}`;

  return (
    <button
      type="button"
      onClick={() => saveThemePref(next)}
      aria-label={theme ? label : t("theme")}
      title={theme ? label : t("theme")}
      className="inline-flex size-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-surface-2"
    >
      {theme === "dark" ? (
        <Moon className="size-5" aria-hidden="true" />
      ) : (
        <Sun className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
