import { deflateSync } from "node:zlib";
import { QR_QUIET_ZONE, qrModules } from "@settlemint/shared";

/**
 * A saved QR code as a PNG, for emails (mail apps won't show inline SVG).
 * Plain square modules in the app's dark green on white: the same text as the
 * original, drawn the most scannable way.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

export function qrPng(text: string, opts: { scale?: number; dark?: [number, number, number] } = {}): Buffer {
  const modules = qrModules(text);
  const scale = opts.scale ?? 10;
  const dark = opts.dark ?? [13, 42, 32];
  const cells = modules.length + QR_QUIET_ZONE * 2;
  const px = cells * scale;
  const rowBytes = Math.ceil(px / 8);

  // 1-bit indexed colour: index 0 = dark, index 1 = white. Each row starts with filter type 0.
  const raw = Buffer.alloc((rowBytes + 1) * px, 0);
  for (let y = 0; y < px; y++) {
    const my = Math.floor(y / scale) - QR_QUIET_ZONE;
    const base = y * (rowBytes + 1);
    for (let x = 0; x < px; x++) {
      const mx = Math.floor(x / scale) - QR_QUIET_ZONE;
      const isDark = my >= 0 && mx >= 0 && my < modules.length && mx < modules.length && modules[my][mx];
      if (!isDark) raw[base + 1 + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(px, 0);
  header.writeUInt32BE(px, 4);
  header[8] = 1; // bit depth
  header[9] = 3; // indexed colour
  const palette = Buffer.from([...dark, 255, 255, 255]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("PLTE", palette),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
