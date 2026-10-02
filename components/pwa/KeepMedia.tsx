"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { keepMediaStored } from "@/lib/media";

/**
 * Keeps the art and audio for the next few Learn batches and for every seen
 * card on the device. It runs when a page opens, when the app comes back into
 * view and when a connection returns; Learn also asks for it at each new batch.
 * Draws nothing.
 */
export function KeepMedia() {
  const pathname = usePathname();

  useEffect(() => {
    void keepMediaStored();
  }, [pathname]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") void keepMediaStored();
    };
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  return null;
}
