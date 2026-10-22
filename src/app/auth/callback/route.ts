import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/** Only same-site, locale-prefixed paths are accepted as a post-login destination. */
function safeNext(next: string | null): string {
  const fallback = `/${routing.defaultLocale}/me`;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  const first = next.split("/")[1];
  return (routing.locales as readonly string[]).includes(first) ? next : fallback;
}

/**
 * Landing point of email confirmation links, password-reset links and Google sign-in.
 * Exchanges the one-time code for a session cookie, then sends the person on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const locale = next.split("/")[1];

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL(`/${locale}/auth?error=callback`, origin));
}
