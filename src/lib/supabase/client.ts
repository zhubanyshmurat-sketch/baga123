import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client (singleton). Returns null in demo mode. */
export function getBrowserClient() {
  if (!supabaseEnv) return null;
  client ??= createBrowserClient(supabaseEnv.url, supabaseEnv.key);
  return client;
}
