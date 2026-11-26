// Regenerates every app and website icon from assets/logo-source.png (the mark on a green rounded square).
// Usage: node mobile/scripts/build-icons.mjs
//
// The source has rounded corners baked in on an off-white background. iPhones apply their own mask and
// want a full square, so the mark itself (the dark S) is lifted out as a shape and redrawn on each
// background:
//   light   green square, dark S     the logo as it is
//   dark    near-black square, green S   what iOS 18+ shows when icons are set to Dark
//   tinted  black square, white S    iOS recolours this one to the person's chosen tint
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// sharp ships with Next.js, so it is already installed for the website.
const require = createRequire(new URL("../../web/package.json", import.meta.url));
const sharp = require("sharp");
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "../assets");
const publicDir = path.join(here, "../../web/public");

const GREEN = { r: 61, g: 213, b: 134 };
const INK = { r: 11, g: 15, b: 28 };
// The website icon: iOS darkens a web app's icon on its own for the Dark Home Screen style, keeping the
// mark's colour and darkening the background. A dark S would vanish; a green S on pale mint survives.
const MINT_PALE = { r: 226, g: 247, b: 236 };
const GREEN_DEEP = { r: 18, g: 160, b: 96 };
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

const { data, info } = await sharp(path.join(assets, "logo-source.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// The S as a coverage mask: 1 where the pixel is ink, 0 where it is green (or the off-white corner).
const markMask = Buffer.alloc(width * height);
// The rounded square as a coverage mask: 1 on green and ink, 0 on the off-white corners.
const squareMask = Buffer.alloc(width * height);
for (let i = 0; i < width * height; i++) {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  markMask[i] = Math.round(clamp01((GREEN.g - g) / (GREEN.g - INK.g)) * 255);
  squareMask[i] = Math.round(clamp01(1 - (r - GREEN.r - 1) / (253 - GREEN.r - 1)) * 255);
}

const channel = (buf, size) =>
  sharp(buf, { raw: { width, height, channels: 1 } })
    .resize(size, size, { kernel: "lanczos3" })
    .extractChannel(0) // keep it one channel; sharp would otherwise widen it to three
    .raw()
    .toBuffer();

/** A full square of `bg` with the mark in `fg`. */
async function fullBleed(size, bg, fg) {
  const mask = await channel(markMask, size);
  const mark = await sharp({ create: { width: size, height: size, channels: 3, background: fg } })
    .joinChannel(mask, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toBuffer();
  // No alpha channel: iOS app icons must be fully opaque.
  return sharp({ create: { width: size, height: size, channels: 3, background: bg } })
    .composite([{ input: mark }])
    .removeAlpha()
    .png();
}

/** The logo as drawn, rounded corners transparent (for browser tabs and splash screens). */
async function rounded(size) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = squareMask[i] / 255;
    for (let c = 0; c < 3; c++) {
      // Edge pixels are mixed with the off-white behind them: take that back out.
      const v = a > 0 ? (data[i * 3 + c] - (1 - a) * 255) / a : 0;
      rgba[i * 4 + c] = Math.round(Math.min(255, Math.max(0, v)));
    }
    rgba[i * 4 + 3] = squareMask[i];
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } }).resize(size, size, { kernel: "lanczos3" }).png();
}

const out = [
  [path.join(assets, "icon.png"), await fullBleed(1024, GREEN, INK)],
  [path.join(assets, "icon-dark.png"), await fullBleed(1024, INK, GREEN)],
  [path.join(assets, "icon-tinted.png"), await fullBleed(1024, BLACK, WHITE)],
  [path.join(assets, "splash-icon.png"), await rounded(1024)],
  [path.join(publicDir, "apple-touch-icon.png"), await fullBleed(180, MINT_PALE, GREEN_DEEP)],
  [path.join(publicDir, "apple-touch-icon-dark.png"), await fullBleed(180, INK, GREEN)],
  [path.join(publicDir, "icon-192.png"), await rounded(192)],
  [path.join(publicDir, "icon-512.png"), await rounded(512)],
];
for (const [file, image] of out) {
  await image.toFile(file);
  console.log("wrote", path.relative(path.join(here, "../.."), file));
}
