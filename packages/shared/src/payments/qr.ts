import qrcode from "qrcode-generator";

/**
 * Saved payment QR codes. People upload the QR their bank or wallet app made
 * for them; we read the text out of it once and redraw it on demand, sharply
 * and in the app's own style. The text is the same, so any banking app reads
 * the redrawn code exactly like the original.
 */

/** UTF-8 bytes, so names and notes in any script survive (the library's own default is Latin-1). */
function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}
(qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes = utf8Bytes;

/** The longest text we keep for a QR (bank QR codes are a few hundred characters). */
export const QR_MAX_LENGTH = 1024;

/** The dark/light grid of a QR code, row by row. Error correction M balances density and damage tolerance. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const rows: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    rows.push(row);
  }
  return rows;
}

/** Quiet zone, in modules, that every QR needs around it to be read. */
export const QR_QUIET_ZONE = 3;

export interface QrArt {
  /** Number of modules per side, not counting the quiet zone. */
  size: number;
  /** One SVG path (fill-rule evenodd) with every dark shape, in module units from 0 to `size`. */
  path: string;
}

const f = (n: number) => String(Math.round(n * 1000) / 1000);

/** A rounded rectangle as a closed path; drawn clockwise, so a second one inside it cuts a hole. */
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return (
    `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}v${f(h - 2 * r)}` +
    `a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}h${f(-(w - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}` +
    `v${f(-(h - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}z`
  );
}

/**
 * The code drawn with rounded shapes: soft squares for data and rounded
 * "eyes" in the three corners. Kept deliberately conservative (full-size
 * modules, the classic eye proportions, no logo in the middle) so it stays
 * as easy to scan as a plain code.
 */
export function qrArt(text: string): QrArt {
  const m = qrModules(text);
  const n = m.length;
  const inEye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c] && !inEye(r, c)) d += roundRect(c + 0.03, r + 0.03, 0.94, 0.94, 0.3);
    }
  }
  for (const [ex, ey] of [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]) {
    d += roundRect(ex, ey, 7, 7, 2.1); // outer ring
    d += reverseRoundRect(ex + 1, ey + 1, 5, 5, 1.4); // its hole
    d += roundRect(ex + 2, ey + 2, 3, 3, 1.05); // the pupil
  }
  return { size: n, path: d };
}

/** Same shape traced the other way round, so it subtracts under evenodd and nonzero alike. */
function reverseRoundRect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return (
    `M${f(x + r)} ${f(y)}a${f(r)} ${f(r)} 0 0 0 ${f(-r)} ${f(r)}v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(r)}` +
    `h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(-r)}v${f(-(h - 2 * r))}a${f(r)} ${f(r)} 0 0 0 ${f(-r)} ${f(-r)}z`
  );
}

/** A complete standalone SVG (for downloads and images), with the quiet zone and colours baked in. */
export function qrSvg(text: string, opts: { dark?: string; light?: string; pixels?: number } = {}): string {
  const { size, path } = qrArt(text);
  const total = size + QR_QUIET_ZONE * 2;
  const px = opts.pixels ?? total * 8;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="geometricPrecision">` +
    `<rect width="${total}" height="${total}" fill="${opts.light ?? "#ffffff"}"/>` +
    `<path transform="translate(${QR_QUIET_ZONE} ${QR_QUIET_ZONE})" fill="${opts.dark ?? "#0d2a20"}" fill-rule="evenodd" d="${path}"/>` +
    `</svg>`
  );
}
