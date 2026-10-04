// Writes the app icons: the concha, the hero mascot (F3), on the paper colour.
// Run: node scripts/make-icons.mjs
//
// The figure is her front view with the background removed
// (content/art/cast/concha-cutout.webp). It stays inside the middle circle of
// 80% of the icon, the safe zone of a maskable icon, so the same file works as
// a maskable icon whatever shape the device cuts it to. After changing the
// files, raise ICON_VERSION in app/manifest.ts so installed copies fetch them.

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const CUTOUT = path.join(ROOT, "content", "art", "cast", "concha-cutout.webp");

// The paper colour, as in app/globals.css and the manifest's background.
const PAPER = { r: 0xff, g: 0xf8, b: 0xec };
// The figure's box as a share of the icon. Her bounding box's corners sit
// inside the safe circle (radius 40%): half the diagonal of a 0.56 box is 0.396.
const FIGURE = 0.56;

const files = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180 };
for (const [name, size] of Object.entries(files)) {
  const box = Math.round(size * FIGURE);
  const figure = await sharp(CUTOUT).resize(box, box, { fit: "inside", kernel: "lanczos3" }).toBuffer();
  const info = await sharp({ create: { width: size, height: size, channels: 3, background: PAPER } })
    .composite([{ input: figure, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, name));
  console.log(`${name}: ${size}x${size}, ${info.size} bytes`);
}
