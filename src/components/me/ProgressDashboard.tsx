"use client";

import { ArrowRight, Flame, Heart, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { MoodChart } from "@/components/charts/MoodChart";
import { useSession } from "@/components/layout/SessionProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { importLocalDataAction } from "@/lib/personal/actions";
import { clearLocalData, hasLocalData, readLocalSnapshot } from "@/lib/personal/local-store";
import type { TestRecord } from "@/lib/personal/types";
import { usePersonalStore, useStoreData } from "@/lib/personal/use-store";
import { getBrowserClient } from "@/lib/supabase/client";
import { readThemePref, saveThemePref } from "@/lib/theme";
import { computeStreak } from "@/lib/utils";
import { ConsentGate, DeleteAccount, ProfileSettings, type Profile } from "./ProfilePanel";

interface Props {
  /** Articles the favourites can point to (slug → title). */
  articles: { slug: string; title: string }[];
  adminLabel: string;
}

function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the profile on sign-out
      setProfile(null);
      return;
    }
    const supabase = getBrowserClient();
    if (!supabase) return;
    let active = true;
    supabase
      .from("profiles")
      .select("display_name, language, theme, consent_at, role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: { data: Profile | null }) => active && setProfile(data));
    return () => {
      active = false;
    };
  }, [userId, tick]);

  return { profile, reload: () => setTick((n) => n + 1) };
}

function ImportBanner({ onDone }: { onDone: () => void }) {
  const t = useTranslations("me");
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && hasLocalData());
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setVisible(hasLocalData());
  }, []);

  if (!visible && state !== "done") return null;

  async function run() {
    setState("busy");
    const result = await importLocalDataAction(readLocalSnapshot());
    if (result.ok) {
      clearLocalData();
      setState("done");
      onDone();
    } else {
      setState("error");
    }
  }

  return (
    <Card className="border-primary bg-primary-soft p-5" role="region" aria-labelledby="import-title">
      {state === "done" ? (
        <p role="status" className="font-semibold">
          {t("importDone")}
        </p>
      ) : (
        <>
          <h2 id="import-title" className="text-lg font-bold">
            {t("importTitle")}
          </h2>
          <p className="mt-1">{t("importText")}</p>
          {state === "error" && (
            <p role="alert" className="mt-2 font-medium text-coral-strong">
              {t("loadError")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={run} disabled={state === "busy"}>
              {t("importAction")}
            </Button>
            <Button variant="ghost" onClick={() => setVisible(false)}>
              {t("importSkip")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearLocalData();
                setVisible(false);
              }}
            >
              {t("importDiscard")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="size-4" aria-hidden="true" />;
  if (delta < 0) return <TrendingDown className="size-4" aria-hidden="true" />;
  return <Minus className="size-4" aria-hidden="true" />;
}

function TestHistory({ records }: { records: TestRecord[] }) {
  const t = useTranslations("me");
  const tt = useTranslations("tests");
  const format = useFormatter();

  if (records.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-2 p-5">
        <p className="text-muted">{t("testsEmpty")}</p>
        <ButtonLink href="/tests" variant="soft" size="sm" className="mt-3">
          {t("testsGo")}
        </ButtonLink>
      </div>
    );
  }

  // Records are newest first; the previous attempt of the same test is the next one down the list.
  return (
    <ul className="divide-y divide-border">
      {records.slice(0, 12).map((r, i) => {
        const previous = records.slice(i + 1).find((x) => x.testSlug === r.testSlug);
        const delta = previous ? r.score - previous.score : null;
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <Link href={`/tests/${r.testSlug}`} className="font-semibold hover:text-primary-strong">
                {r.testTitle}
              </Link>
              <p className="text-sm text-muted">
                {format.dateTime(new Date(r.createdAt), { dateStyle: "medium" })}
              </p>
            </div>
            <Badge tone="primary">{tt(`level.${r.level}`)}</Badge>
            <span className="text-sm font-semibold tabular-nums">{tt("score", { score: r.score, max: r.maxScore })}</span>
            {delta !== null && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <TrendIcon delta={delta} />
                {delta > 0 ? t("trendUp") : delta < 0 ? t("trendDown") : t("trendSame")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ProgressDashboard({ articles, adminLabel }: Props) {
  const t = useTranslations("me");
  const tc = useTranslations("common");
  const { ready, user, configured } = useSession();
  const store = usePersonalStore();
  const { profile, reload: reloadProfile } = useProfile(user?.id ?? null);

  const moods = useStoreData((s) => s.getMoods(30));
  const tests = useStoreData((s) => s.listTests());
  const favorites = useStoreData((s) => s.listFavorites());
  const days = useStoreData((s) => s.practiceDays());

  const reloadAll = useCallback(() => {
    moods.reload();
    tests.reload();
    favorites.reload();
    days.reload();
  }, [moods, tests, favorites, days]);

  // On a device where the person never chose a theme, adopt the one saved in their profile.
  useEffect(() => {
    if (profile && profile.theme !== "system" && readThemePref() === "system") saveThemePref(profile.theme);
  }, [profile]);

  if (!ready || !store) {
    return <p className="text-muted">{tc("loading")}</p>;
  }

  if (user && profile && !profile.consent_at) {
    return <ConsentGate onDone={reloadProfile} />;
  }

  const streak = computeStreak(days.data ?? []);
  const titles = new Map(articles.map((a) => [a.slug, a.title]));
  const favoriteArticles = (favorites.data ?? []).filter((f) => f.type === "article" && titles.has(f.slug));
  const loadFailed = moods.error || tests.error || favorites.error || days.error;

  return (
    <div className="space-y-6">
      {!user && (
        <Card className="border-accent bg-accent-soft p-6" role="region" aria-labelledby="guest-title">
          <h2 id="guest-title" className="text-xl font-bold">
            {t("guestTitle")}
          </h2>
          <p className="mt-2">{configured ? t("guestText") : null}</p>
          {!configured && <p className="mt-2">{tc("demoNotice")}</p>}
          {configured && (
            <ButtonLink href="/auth" className="mt-4">
              {t("register")}
            </ButtonLink>
          )}
        </Card>
      )}

      {user && <ImportBanner onDone={reloadAll} />}

      {loadFailed && (
        <p role="alert" className="rounded-2xl bg-coral-soft p-4 font-medium text-coral-strong">
          {t("loadError")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("moodTitle")}</h2>
          <div className="mt-4">
            {moods.loading ? <p className="text-muted">{tc("loading")}</p> : <MoodChart entries={moods.data ?? []} />}
          </div>
          {!moods.loading && (moods.data?.length ?? 0) === 0 && (
            <ButtonLink href="/" variant="soft" size="sm" className="mt-3">
              {tc("start")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-bold">{t("streak")}</h2>
          </div>
          <p className="mt-4 text-4xl font-extrabold tabular-nums">{t("streakDays", { count: streak })}</p>
          <p className="mt-2 text-sm text-muted">{streak > 0 ? t("streakHint") : t("streakZero")}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-2 text-xl font-bold">{t("testsTitle")}</h2>
        {tests.loading ? <p className="text-muted">{tc("loading")}</p> : <TestHistory records={tests.data ?? []} />}
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
          <Heart className="size-5 text-coral-strong" aria-hidden="true" />
          {t("favoritesTitle")}
        </h2>
        {favoriteArticles.length === 0 ? (
          <p className="text-muted">{t("favoritesEmpty")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {favoriteArticles.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/articles/${f.slug}`}
                  className="flex min-h-12 items-center rounded-2xl bg-surface-2 px-4 font-semibold hover:bg-primary-soft"
                >
                  {titles.get(f.slug)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {user && profile && (
        <>
          <ProfileSettings userId={user.id} profile={profile} onSaved={reloadProfile} />
          {(profile.role === "editor" || profile.role === "admin") && (
            <ButtonLink href="/admin" variant="secondary">
              {adminLabel}
            </ButtonLink>
          )}
          <DeleteAccount />
        </>
      )}
    </div>
  );
}
