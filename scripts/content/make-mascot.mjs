// Hero mascot loops (F3, transparent since U2): `npm run mascot`, or
// `npm run mascot -- --lang de` for the German lead (DE5): content/de/art/mascot/takes.json
// into the files lang/de.ts names. A language whose files are another's (German's
// are the concha's until DE14) is refused, so a run never overwrites the other app's mascot.
//
// Reads content/art/mascot/takes.json (each Higgsfield take, and which idle and
// celebration take the app uses), then:
//   1. downloads any raw take, and any take's cut-out, missing from content/.cache/mascot/
//      (mascot-<lang>/ for another language; its paths are `mascotPaths` in mascot.mjs),
//   2. encodes every take to content/art/mascot/takes/<take>.mp4 for the takes
//      page: 480 px square H.264 with no sound, the background brought back to
//      the paper colour and the repeated last frame dropped so it loops cleanly,
//   3. for the two takes in use, mattes each frame from the take on cream and
//      Higgsfield's cut-out of it on black (`matteFrame`), crops a square around
//      the character and writes public/mascot/<kind>.webm (VP9 with alpha, for
//      Chrome, Firefox and Android) and <kind>.mov (HEVC with alpha, for Safari
//      and iPhone; VideoToolbox on macOS, elsewhere the system ffmpeg's x265), each with its first
//      frame as a transparent WebP poster (also the reduced-motion still),
//   4. writes public/mascot/concha.webp, the still for the empty screens, from
//      the concha's cutout (content/art/cast/concha-cutout.webp),
//   5. writes content/art/mascot/takes.html, a page for watching the takes.
// Rules: docs/design.md, "Art", "Decided in F3" and "Decided in U2". No Higgsfield
// calls: takes and cut-outs are made by hand (see the F3 and U2 notes) and added to takes.json.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import {
  CLIP_SIZE,
  STILL_SIZE,
  backgroundGains,
  checkTakes,
  dropFilter,
  gainFilter,
  isDropped,
  loopSeconds,
  mascotPaths,
  matteFrame,
  probe,
  sharedMascotFiles,
  squareAround,
  visibleBox,
} from "./mascot.mjs";
import { parseLang } from "./script-lang.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const lang = parseLang(args.includes("--lang") ? args[args.indexOf("--lang") + 1] : undefined);
const shared = sharedMascotFiles(lang);
if (shared.length) {
  console.error(`The ${lang} mascot files are the Spanish concha's (${shared.join(", ")}); give it its own in lang/${lang}.ts first (DE14).`);
  process.exit(2);
}
const paths = mascotPaths(ROOT, lang);
const ART = paths.art;
const CACHE = paths.cache;
const TAKES = path.join(ART, "takes");
const CUTOUT = paths.cutout;
const rel = (file) => path.relative(ROOT, file);

const record = JSON.parse(readFileSync(path.join(ART, "takes.json"), "utf8"));
checkTakes(record);
for (const dir of [CACHE, TAKES, path.dirname(paths.idle.webm), path.dirname(paths.celebrate.webm), path.dirname(paths.still)]) mkdirSync(dir, { recursive: true });

const kb = (file) => `${(statSync(file).size / 1024).toFixed(1)} KB`;

function ffmpeg(args) {
  const run = spawnSync(ffmpegPath, ["-hide_banner", "-v", "error", "-y", ...args], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${run.stderr.trim().split("\n").slice(-3).join(" ")}`);
}

/** The first frame of a clip, scaled to `size`, as raw RGB. */
function firstFrame(file, size, filter) {
  const vf = [filter, `scale=${size}:${size}:flags=lanczos`].filter(Boolean).join(",");
  return execFileSync(ffmpegPath, ["-v", "error", "-i", file, "-vf", vf, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

async function download(url, file) {
  if (existsSync(file)) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${path.basename(file)}: ${response.status}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

/** Every frame of a clip up to `count`, at its own size, as raw RGB. */
function frames(file, width, height, count) {
  const all = execFileSync(ffmpegPath, ["-v", "error", "-i", file, "-vf", `scale=${width}:${height}`, "-frames:v", String(count), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  const size = width * height * 3;
  return Array.from({ length: Math.floor(all.length / size) }, (_, i) => all.subarray(i * size, (i + 1) * size));
}

/** Encodes raw RGBA frames, cropped and scaled to the clip size, with ffmpeg reading them from stdin. */
function encodeRgba(rgba, width, height, fps, crop, codec, out) {
  const run = spawnSync(
    ffmpegPath,
    [
      "-hide_banner", "-v", "error", "-y",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(fps), "-i", "-",
      "-vf", `crop=${crop.side}:${crop.side}:${crop.x}:${crop.y},scale=${CLIP_SIZE}:${CLIP_SIZE}:flags=lanczos`,
      "-an", ...codec, out,
    ],
    { input: Buffer.concat(rgba), maxBuffer: 64 * 1024 * 1024, encoding: "utf8" },
  );
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${path.basename(out)}: ${run.stderr.trim().split("\n").slice(-3).join(" ")}`);
}

const VP9_ALPHA = ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "42", "-row-mt", "1", "-auto-alt-ref", "0"];
const HEVC_ALPHA = ["-c:v", "hevc_videotoolbox", "-allow_sw", "1", "-alpha_quality", "0.6", "-q:v", "45", "-pix_fmt", "bgra", "-tag:v", "hvc1", "-movflags", "+faststart"];
// Off macOS (DE14): no ffmpeg encodes HEVC with alpha unless its x265 was built with ENABLE_ALPHA, which
// distributions leave off. So the frames go to an x265 command-line tool built that way (its path in
// MASCOT_X265), and FFmpeg 8 or later (the system's `ffmpeg`, as ffmpeg-static 7.0 splits the alpha layer
// into frames of its own) wraps the stream in a .mov. Safari reads x265's alpha layer as it reads VideoToolbox's.
// No B-frames: the raw stream carries no timestamps, so a frame's place in the file must be its place in the
// loop (with B-frames the wrapped file plays them out of order), as VideoToolbox's files have it.
const X265_ALPHA = ["--input-csp", "i420", "--alpha", "--bframes", "0", "--crf", "30", "--preset", "slow", "--colorprim", "bt709", "--transfer", "bt709", "--colormatrix", "smpte170m", "--range", "limited", "--log-level", "error"];

/** The HEVC loop off macOS: crop and convert with ffmpeg-static, encode with x265's alpha layer, wrap with FFmpeg 8. */
function encodeHevcX265(rgba, width, height, fps, crop, out) {
  const yuva = path.join(CACHE, `${path.basename(out)}.yuva`);
  const hevc = path.join(CACHE, `${path.basename(out)}.hevc`);
  // ffmpeg's default conversion from RGB is BT.601, limited range, which the stream says it is.
  encodeRgba(rgba, width, height, fps, crop, ["-pix_fmt", "yuva420p", "-f", "rawvideo"], yuva);
  const x265 = spawnSync(process.env.MASCOT_X265, ["--input", yuva, "--input-res", `${CLIP_SIZE}x${CLIP_SIZE}`, "--fps", String(fps), ...X265_ALPHA, "--output", hevc], { encoding: "utf8" });
  if (x265.status !== 0) throw new Error(`x265 failed on ${path.basename(out)}: ${x265.stderr.trim().split("\n").slice(-3).join(" ")}`);
  const wrap = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-fflags", "+genpts", "-r", String(fps), "-i", hevc, "-c", "copy", "-tag:v", "hvc1", "-movflags", "+faststart", out], { encoding: "utf8" });
  if (wrap.status !== 0) throw new Error(`ffmpeg failed to wrap ${path.basename(out)}: ${wrap.stderr.trim().split("\n").slice(-3).join(" ")}`);
  rmSync(yuva);
  rmSync(hevc);
}

/** Checks before any work that this machine can make the HEVC loops: macOS, or an alpha-enabled x265 and FFmpeg 8. */
function checkHevc() {
  if (process.platform === "darwin") return;
  const help = process.env.MASCOT_X265 ? spawnSync(process.env.MASCOT_X265, ["--help"], { encoding: "utf8" }) : null;
  const version = spawnSync("ffmpeg", ["-hide_banner", "-version"], { encoding: "utf8" });
  const major = Number(/ffmpeg version n?(\d+)/.exec(version.stdout ?? "")?.[1] ?? 0);
  if (!help || !/--alpha/.test(`${help.stdout}${help.stderr}`) || major < 8) {
    console.error("The HEVC loops (Safari, iPhone) need macOS, or off it MASCOT_X265 naming an x265 built with -DENABLE_ALPHA=ON and FFmpeg 8 or later as `ffmpeg`; see docs/german.md, \"Decided in DE14\".");
    process.exit(2);
  }
}
checkHevc();

/** The transparent loop of a take in use, in both formats, with its poster. */
async function transparent(take, kind) {
  const raw = path.join(CACHE, `${take.name}.mp4`);
  const cut = path.join(CACHE, `${take.name}-cutout.mp4`);
  await download(take.cutout.url, cut);
  const { duration, fps, width, height } = probe(spawnSync(ffmpegPath, ["-hide_banner", "-i", raw], { encoding: "utf8" }).stderr);
  const count = Math.round(loopSeconds(duration, fps) * fps);
  const kept = (_, n) => !isDropped(n, take.drop);
  const cream = frames(raw, width, height, count).filter(kept);
  const black = frames(cut, width, height, count).filter(kept);
  if (cream.length !== black.length) throw new Error(`${take.name}: ${cream.length} frames but its cut-out has ${black.length}`);
  const rgba = cream.map((frame, i) => matteFrame(frame, black[i], width, height));
  const boxes = rgba.map((frame) => visibleBox(frame, width, height)).filter(Boolean);
  const box = {
    left: Math.min(...boxes.map((b) => b.left)),
    top: Math.min(...boxes.map((b) => b.top)),
    right: Math.max(...boxes.map((b) => b.right)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
  const crop = squareAround(box, width, height);
  const { webm, hevc: mov, poster: posterFile } = paths[kind];
  encodeRgba(rgba, width, height, fps, crop, VP9_ALPHA, webm);
  if (process.platform === "darwin") encodeRgba(rgba, width, height, fps, crop, HEVC_ALPHA, mov);
  else encodeHevcX265(rgba, width, height, fps, crop, mov);
  await sharp(rgba[0], { raw: { width, height, channels: 4 } })
    .extract({ left: crop.x, top: crop.y, width: crop.side, height: crop.side })
    .resize(CLIP_SIZE, CLIP_SIZE, { kernel: "lanczos3" })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(posterFile);
  console.log(`${rel(webm)}: ${take.name}, ${rgba.length} frames, crop ${crop.side} px at ${crop.x},${crop.y}; webm ${kb(webm)}, mov ${kb(mov)}, poster ${kb(posterFile)}`);
}

async function encode(take) {
  const raw = path.join(CACHE, `${take.name}.mp4`);
  await download(take.url, raw);
  const banner = spawnSync(ffmpegPath, ["-hide_banner", "-i", raw], { encoding: "utf8" }).stderr;
  const { duration, fps } = probe(banner);
  const gains = backgroundGains(firstFrame(raw, CLIP_SIZE), CLIP_SIZE);
  const out = path.join(TAKES, `${take.name}.mp4`);
  // With frames cut, the clip ends by frame count: the loop's frames less the dropped ones.
  const count = Math.round(loopSeconds(duration, fps) * fps);
  const kept = Array.from({ length: count }, (_, n) => n).filter((n) => !isDropped(n, take.drop)).length;
  ffmpeg([
    "-i", raw,
    ...(take.drop?.length ? ["-frames:v", String(kept)] : ["-t", loopSeconds(duration, fps).toFixed(3)]),
    "-vf", [dropFilter(take.drop), gainFilter(gains), `scale=${CLIP_SIZE}:${CLIP_SIZE}:flags=lanczos`].filter(Boolean).join(","),
    "-an",
    "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow",
    "-movflags", "+faststart",
    out,
  ]);
  console.log(`${take.name}: ${duration.toFixed(2)} s at ${fps} fps, gains ${gains.map((g) => g.toFixed(3)).join(" ")}, ${kb(out)}`);
  return out;
}

for (const take of record.takes) await encode(take);

for (const kind of ["idle", "celebrate"]) {
  await transparent(record.takes.find((take) => take.name === record.use[kind]), kind);
  // The opaque loops of F3, replaced by the transparent pair.
  rmSync(path.join(path.dirname(paths[kind].webm), `${kind}.mp4`), { force: true });
}

// The still: fitted with a 4% margin, as the card stills are (F2).
const inner = Math.round(STILL_SIZE * 0.92);
const figure = await sharp(CUTOUT).resize(inner, inner, { fit: "inside" }).toBuffer();
const still = paths.still;
await sharp({ create: { width: STILL_SIZE, height: STILL_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: figure, gravity: "center" }])
  .webp({ quality: 82 })
  .toFile(still);
console.log(`${rel(still)}: ${kb(still)}`);

// The takes page: each take as the app shows it, on the menu's paper and on a white card.
const row = (take) => {
  const inUse = Object.entries(record.use).find(([, name]) => name === take.name)?.[0];
  return `<figure><div class="pair"><div class="paper"><video src="takes/${take.name}.mp4" autoplay loop muted playsinline></video></div><div class="white"><video src="takes/${take.name}.mp4" autoplay loop muted playsinline></video></div></div><figcaption><b>${take.name}</b> · ${take.model}${inUse ? ` · <em>in use (${inUse})</em>` : ""}</figcaption></figure>`;
};
writeFileSync(
  path.join(ART, "takes.html"),
  `<!doctype html>
<meta charset="utf-8">
<title>Mascot takes</title>
<style>
  body { font: 16px system-ui, sans-serif; background: #fff8ec; color: #2b2340; margin: 24px; }
  main { display: flex; flex-wrap: wrap; gap: 24px; }
  .pair { display: flex; gap: 8px; }
  .paper, .white { padding: 8px; border-radius: 16px; }
  .white { background: #fff; border: 2px solid #eee4d4; }
  video { width: 160px; height: 160px; display: block;
    mask-image: radial-gradient(closest-side, #000 80%, transparent);
    -webkit-mask-image: radial-gradient(closest-side, #000 80%, transparent); }
</style>
<h1>Mascot takes</h1>
<p>Generated by <code>npm run mascot</code> from <code>takes.json</code>. To use another take, change <code>use</code> in takes.json and run <code>npm run mascot</code> again.</p>
<main>
${record.takes.map(row).join("\n")}
</main>
`,
);
console.log(`${rel(path.join(ART, "takes.html"))}: ${record.takes.length} takes`);
