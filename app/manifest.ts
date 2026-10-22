import type { MetadataRoute } from "next";
import { LANG } from "@/lang";
import { appManifest } from "@/lib/pwa/manifest";

// The names and icons come from the build's language (lang/). Raise `icons.version`
// there when the icon files change, so installed copies fetch the new ones.
export default function manifest(): MetadataRoute.Manifest {
  return appManifest(LANG);
}
