import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  await updateSession(request, response);
  return response;
}

export const config = {
  // Skip API routes, the (locale-less) OAuth callback, Next internals and any file with an extension.
  matcher: ["/((?!api|auth/callback|_next|_vercel|.*\..*).*)"],
};
