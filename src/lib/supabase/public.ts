import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Revalidation window for public content, in seconds. */
export const CONTENT_REVALIDATE = 300;
/** Cache tag used to purge public content after an admin edit. */
export const CONTENT_TAG = "content";

/**
 * Anonymous client for public content (topics, articles, tests, exercises, help contacts).
 * It never touches cookies, so pages stay statically rendered; requests go through
 * the Next.js data cache and are purged by `revalidateTag(CONTENT_TAG)`.
 */
export function createPublicClient() {
  if (!supabaseEnv) return null;
  return createSupabaseClient(supabaseEnv.url, supabaseEnv.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate: CONTENT_REVALIDATE, tags: [CONTENT_TAG] },
        }),
    },
  });
}
