"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePersonalStore } from "@/lib/personal/use-store";
import type { FavoriteType } from "@/lib/personal/types";
import { cn } from "@/lib/utils";

export function FavoriteButton({ type, slug }: { type: FavoriteType; slug: string }) {
  const t = useTranslations("articles");
  const store = usePersonalStore();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!store) return;
    let active = true;
    store
      .listFavorites()
      .then((favs) => active && setOn(favs.some((f) => f.type === type && f.slug === slug)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [store, type, slug]);

  async function toggle() {
    if (!store || busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await store.setFavorite(type, slug, next);
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  const label = on ? t("favoriteRemove") : t("favoriteAdd");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      disabled={!store}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
        on
          ? "border-coral-strong bg-coral-soft text-coral-strong"
          : "border-border-strong hover:bg-surface-2",
      )}
    >
      <Heart className={cn("size-4", on && "fill-current")} aria-hidden="true" />
      {label}
    </button>
  );
}
