import type { MetadataRoute } from "next";

// Change this when the icon files change, so installed copies fetch the new ones.
const ICON_VERSION = "1";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Learn Spanish",
    short_name: "Spanish",
    description: "The 1,000 most common Spanish words, most common first.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The paper colour, as in app/globals.css.
    background_color: "#fff8ec",
    theme_color: "#fff8ec",
    icons: [
      { src: `/icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
