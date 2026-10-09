// The language this build teaches (docs/german.md, "The language config").
// Chosen at build time by NEXT_PUBLIC_LANG: `es` when unset, so the Spanish
// deployment needs no change. Next inlines `process.env.NEXT_PUBLIC_LANG` into
// the browser's code, so it must be read by that exact name.

import { de } from "./de";
import { es } from "./es";
import { LANG_CODES, type LangCode, type LangConfig } from "./types";

export { LANG_CODES, type LangCode, type LangConfig, type MascotLoop } from "./types";

export const LANGS: Readonly<Record<LangCode, LangConfig>> = { es, de };

/** The config for a language code. Unset or empty is Spanish; anything else unknown is refused, so a typo fails the build. */
export function langConfig(code: string | undefined): LangConfig {
  if (!code) return es;
  if (!(LANG_CODES as readonly string[]).includes(code)) {
    throw new Error(`Unknown NEXT_PUBLIC_LANG "${code}": expected ${LANG_CODES.join(" or ")}`);
  }
  return LANGS[code as LangCode];
}

/** Every name the app keeps on the device, for one language. Spanish keeps the names it had before DE1. */
export function storageNames(config: LangConfig) {
  const prefix = config.storage;
  return {
    /** The Dexie database. */
    database: prefix,
    /** `localStorage`: the mute switch. */
    muted: `${prefix}.muted`,
    /** `localStorage`: this browser's device id. */
    deviceId: `${prefix}.device-id`,
    /** `localStorage`: the install prompt was dismissed. */
    installDismissed: `${prefix}.install-dismissed`,
    /** `localStorage`: when this device last finished a sync. */
    lastSync: `${prefix}.last-sync`,
    /** `localStorage`: the signed-in session. */
    auth: `${prefix}.auth`,
    /** The window event fired after a sync that brought rows in (not stored). */
    syncedEvent: `${prefix}:synced`,
    /** The service worker's cache, before the build id. */
    shellPrefix: `${prefix}-shell-`,
    /** The cache of art and audio (lib/media). */
    mediaCache: `${prefix}-media`,
  } as const;
}

export type StorageNames = ReturnType<typeof storageNames>;

/** This build's language. */
export const LANG: LangConfig = langConfig(process.env.NEXT_PUBLIC_LANG);

/** This build's names on the device. */
export const NAMES: StorageNames = storageNames(LANG);
