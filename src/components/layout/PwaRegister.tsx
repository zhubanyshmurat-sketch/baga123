"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Pages that must keep working without a network. */
const OFFLINE_PATHS = ["", "/help", "/exercises", "/exercises/breathing-478", "/exercises/breathing-box"];

/** Registers the service worker (production only) and asks it to store the offline pages. */
export function PwaRegister() {
  const locale = useLocale();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        registration.active?.postMessage({
          type: "PRECACHE",
          urls: OFFLINE_PATHS.map((p) => `/${locale}${p}`),
        });
      })
      .catch(() => {
        // Offline support is an enhancement; the site works without it.
      });
  }, [locale]);

  return null;
}
