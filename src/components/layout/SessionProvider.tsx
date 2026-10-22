"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface SessionUser {
  id: string;
  email?: string;
}

interface SessionState {
  /** A Supabase project is connected. False = demo mode (no accounts). */
  configured: boolean;
  /** The initial session lookup has finished. */
  ready: boolean;
  user: SessionUser | null;
}

const SessionContext = createContext<SessionState>({
  configured: isSupabaseConfigured,
  ready: !isSupabaseConfigured,
  user: null,
});

/**
 * Tracks the signed-in user in the browser. It only drives the interface (header, which store
 * to use); every protected read and write is enforced by row level security on the server.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    configured: isSupabaseConfigured,
    ready: !isSupabaseConfigured,
    user: null,
  });

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    let active = true;

    const toUser = (u: { id: string; email?: string } | null | undefined): SessionUser | null =>
      u ? { id: u.id, email: u.email } : null;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (active) setState({ configured: true, ready: true, user: toUser(data.session?.user) });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setState({ configured: true, ready: true, user: toUser(session?.user) });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
