// What the app can tell about being installed. Pure: the caller passes in what the browser reports.

export interface Device {
  userAgent: string;
  /** iPadOS calls itself a Mac; a Mac with a touch screen is an iPad. */
  maxTouchPoints: number;
  /** True when the page runs as an installed app (home screen), not in a browser tab. */
  standalone: boolean;
}

/**
 * How the app can ask to be installed:
 * - `installed`: already running from the home screen, nothing to ask.
 * - `ios`: an iPhone or iPad, where the only way is the Share menu, so the app shows the steps.
 * - `browser`: anywhere else. The browser says when it can install the app (`beforeinstallprompt`), or never does.
 */
export type InstallPath = "installed" | "ios" | "browser";

export function isIos({ userAgent, maxTouchPoints }: Pick<Device, "userAgent" | "maxTouchPoints">): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function installPath(device: Device): InstallPath {
  if (device.standalone) return "installed";
  return isIos(device) ? "ios" : "browser";
}

/** The service worker's address for a build. A new build id makes the browser install a new worker. */
export function serviceWorkerUrl(buildId: string | undefined): string {
  return `/sw.js?v=${encodeURIComponent(buildId || "dev")}`;
}

/** `localStorage` key that remembers the install prompt was dismissed. */
export const INSTALL_DISMISSED_KEY = "learn-spanish.install-dismissed";
