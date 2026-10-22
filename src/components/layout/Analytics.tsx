import Script from "next/script";

/**
 * Cookie-free, privacy-friendly analytics (Plausible or Umami). Renders nothing unless both
 * NEXT_PUBLIC_ANALYTICS_SRC and NEXT_PUBLIC_ANALYTICS_DOMAIN are set. No personal data is sent.
 */
export function Analytics() {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!src || !domain) return null;
  return <Script defer src={src} data-domain={domain} data-website-id={domain} strategy="afterInteractive" />;
}
