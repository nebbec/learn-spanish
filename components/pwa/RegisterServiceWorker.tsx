"use client";

import { useEffect } from "react";
import { serviceWorkerUrl } from "@/lib/pwa";

/**
 * Registers the service worker (`public/sw.js`) on every page. Production
 * builds only: in development it would serve stale files while they are edited.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(serviceWorkerUrl(process.env.NEXT_PUBLIC_BUILD_ID), { scope: "/" }).catch(() => {
      // Without a worker the app still works online; the next visit tries again.
    });
  }, []);
  return null;
}
