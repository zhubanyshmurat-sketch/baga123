import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session and writes the new cookies onto `response`.
 * Skipped for visitors without an auth cookie, so anonymous traffic stays cheap.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!supabaseEnv) return;
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasAuthCookie) return;

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // Validates the JWT and rotates the tokens if they are about to expire.
  await supabase.auth.getUser();
}
