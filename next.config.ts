import type { NextConfig } from "next";
import path from "node:path";

// next-intl is wired up by hand instead of through `next-intl/plugin`. The plugin loads
// @swc/core (only needed for its optional message-extraction feature), and that native module
// refuses to start on Windows machines whose AppData folder is writable by another account.
// This is exactly what the plugin does for us: alias `next-intl/config` to the request config.
const requestConfig = "./src/i18n/request.ts";

const isDev = process.env.NODE_ENV !== "production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");
const analyticsOrigin = process.env.NEXT_PUBLIC_ANALYTICS_SRC
  ? new URL(process.env.NEXT_PUBLIC_ANALYTICS_SRC).origin
  : "";
const captcha = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ? "https://challenges.cloudflare.com"
  : "";

// Scripts need 'unsafe-inline' because pages are statically rendered (a per-request
// nonce would force dynamic rendering for every route). Everything else is locked down.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${analyticsOrigin} ${captcha}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${analyticsOrigin} ${isDev ? "ws:" : ""}`.replace(/\s+/g, " ").trim(),
  `frame-src ${captcha || "'none'"}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // The site is statically rendered with time-based revalidation (ISR); see src/lib/content.
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    // Without this Turbopack guesses the workspace root from the nearest lockfile, which on this
    // machine is one in the home directory, and then scans the whole profile (a 38-minute build).
    root: process.cwd(),
    resolveAlias: { "next-intl/config": requestConfig },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["next-intl/config"] = path.resolve(config.context ?? process.cwd(), requestConfig);
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
