// Writes the app icons: the hero mascot (F3) on the paper colour, the concha for
// Spanish and, with --lang de, the Brezel for German (DE14).
// Run: npx tsx scripts/make-icons.mjs [--lang de]
//
// The figure is the lead's front view with the background removed, the cutout
// the mascot's still is named after (content/art/cast/<lead>-cutout.webp). It
// stays inside the middle circle of 80% of the icon, the safe zone of a maskable
// icon, so the same file works as a maskable icon whatever shape the device cuts
// it to. The files go where the language's config (lang/) names them; after
// changing them, raise `icons.version` there so installed copies fetch them.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { LANGS } from "../lang/index.ts";
import { mascotPaths } from "./content/mascot.mjs";
import { parseLang } from "./content/script-lang.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const lang = parseLang(args.includes("--lang") ? args[args.indexOf("--lang") + 1] : undefined);
const CUTOUT = mascotPaths(ROOT, lang).cutout;
const { icon192, icon512, apple } = LANGS[lang].icons;

// The paper colour, as in app/globals.css and the manifest's background.
const PAPER = { r: 0xff, g: 0xf8, b: 0xec };
// The figure's box as a share of the icon. Her bounding box's corners sit
// inside the safe circle (radius 40%): half the diagonal of a 0.56 box is 0.396.
const FIGURE = 0.56;

const files = { [icon192]: 192, [icon512]: 512, [apple]: 180 };
for (const [name, size] of Object.entries(files)) {
  const out = path.join(ROOT, "public", name);
  mkdirSync(path.dirname(out), { recursive: true });
  const box = Math.round(size * FIGURE);
  const figure = await sharp(CUTOUT).resize(box, box, { fit: "inside", kernel: "lanczos3" }).toBuffer();
  const info = await sharp({ create: { width: size, height: size, channels: 3, background: PAPER } })
    .composite([{ input: figure, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`${name}: ${size}x${size}, ${info.size} bytes`);
}
