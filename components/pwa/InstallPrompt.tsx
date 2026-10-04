"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { INSTALL_DISMISSED_KEY, installPath, type InstallPath } from "@/lib/pwa";

/** Chrome's install event. Not in TypeScript's DOM types. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

const STANDALONE = "(display-mode: standalone)";

function readInstallPath(): InstallPath {
  const standalone =
    (!!window.matchMedia && window.matchMedia(STANDALONE).matches) ||
    // Safari's own flag for a page opened from the home screen.
    (navigator as { standalone?: boolean }).standalone === true;
  return installPath({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0, standalone });
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const noSubscription = () => () => {};

/**
 * Asks for the app to be installed, on the menu. On an iPhone or iPad it shows
 * the Share-menu steps, since Safari has no install button and deletes a
 * site's data after a week unless the app is on the home screen. Elsewhere it
 * shows an Install button once the browser offers one. Draws nothing when the
 * app is already installed or the prompt was dismissed.
 */
export function InstallPrompt() {
  // "installed" on the server and during hydration, so nothing is drawn until the browser has been asked.
  const path = useSyncExternalStore<InstallPath>(noSubscription, readInstallPath, () => "installed");
  const dismissedBefore = useSyncExternalStore(noSubscription, wasDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onOffer = (event: Event) => {
      // Stops Chrome's own banner, so the button below is the one way in.
      event.preventDefault();
      setOffer(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setOffer(null);
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // Private browsing: the prompt comes back on the next visit.
    }
  };

  const install = async () => {
    if (!offer) return;
    setOffer(null);
    await offer.prompt();
  };

  if (path === "installed" || dismissed || dismissedBefore) return null;
  if (path === "browser" && !offer) return null;

  return (
    <aside
      data-testid="install-prompt"
      aria-label="Install the app"
      className="mx-auto w-full max-w-md px-6 pt-6"
    >
      <div className="flex flex-col gap-3 rounded-card bg-brand-soft p-4">
        <h2 className="font-display text-xl font-bold">Study without a connection</h2>
        {path === "ios" ? (
          <>
            <p data-testid="install-ios">
              Add Learn Spanish to your Home Screen: tap <strong>Share</strong>, then{" "}
              <strong>Add to Home Screen</strong>, and open it from there.
            </p>
            <p className="text-sm text-ink-soft">
              On iPhone this also keeps your progress safe. Safari clears a site&apos;s data after a week without a
              visit, but not an app on the Home Screen.
            </p>
          </>
        ) : (
          <p>Install Learn Spanish to open it from your home screen, online or off.</p>
        )}
        <div className="flex gap-3">
          {path === "browser" && (
            <button
              type="button"
              data-testid="install-button"
              onClick={install}
              className="rounded-button bg-brand px-4 py-2 font-bold text-on-brand"
            >
              Install
            </button>
          )}
          <button
            type="button"
            data-testid="install-dismiss"
            onClick={dismiss}
            className="rounded-button px-4 py-2 font-bold text-ink"
          >
            {path === "ios" ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </aside>
  );
}
