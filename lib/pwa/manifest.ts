import type { MetadataRoute } from "next";
import type { LangConfig } from "@/lang";

/** The web manifest for one language (app/manifest.ts serves the build's). */
export function appManifest(lang: LangConfig): MetadataRoute.Manifest {
  // `icons.version` changes when the icon files change, so installed copies fetch the new ones.
  const v = lang.icons.version;
  return {
    id: "/",
    name: lang.appName,
    short_name: lang.shortName,
    description: lang.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The paper colour, as in app/globals.css.
    background_color: "#fff8ec",
    theme_color: "#fff8ec",
    icons: [
      { src: `${lang.icons.icon192}?v=${v}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${lang.icons.icon512}?v=${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${lang.icons.icon512}?v=${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
