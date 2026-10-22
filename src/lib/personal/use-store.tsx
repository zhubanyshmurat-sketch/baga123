"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/components/layout/SessionProvider";
import type { Locale } from "@/lib/content/types";
import { getBrowserClient } from "@/lib/supabase/client";
import { createLocalStore } from "./local-store";
import { createRemoteStore } from "./remote-store";
import type { PersonalStore } from "./types";

/**
 * The store for the current visitor: remote for a signed-in student, local (this device) for
 * everyone else. Null while the session lookup is still running.
 */
export function usePersonalStore(): PersonalStore | null {
  const locale = useLocale() as Locale;
  const { ready, user } = useSession();
  const userId = user?.id ?? null;

  return useMemo(() => {
    if (!ready) return null;
    if (userId) {
      const supabase = getBrowserClient();
      if (supabase) return createRemoteStore(supabase, userId, locale);
    }
    return createLocalStore();
  }, [ready, userId, locale]);
}

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Loads data from the personal store and reloads when the store changes (sign in/out).
 * `load` may be an inline function; only the store identity triggers a reload.
 */
export function useStoreData<T>(
  load: (store: PersonalStore) => Promise<T>,
): AsyncState<T> {
  const store = usePersonalStore();
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: boolean }>({
    data: undefined,
    loading: true,
    error: false,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!store) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows the loading state while a (re)load starts
    setState((s) => ({ ...s, loading: true, error: false }));
    loadRef
      .current(store)
      .then((data) => active && setState({ data, loading: false, error: false }))
      .catch((err) => {
        console.error("[store]", err instanceof Error ? err.message : err);
        if (active) setState({ data: undefined, loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, [store, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
