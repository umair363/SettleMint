import { inflateSync } from "node:zlib";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { qrArt, qrModules, qrSvg } from "@settlemint/shared";
import { qrPng } from "../services/qr-png";

// A realistic bank QR text (EMV-style payload, as Raast and wallet apps make).
const BANK_QR = "00020101021126400014A000000677010112011234567890123456789005204739953035865802PK5909Ana Souza6007Karachi6304ABCD";

/** Reads our own PNG back (1-bit indexed, as qrPng writes it) into RGBA pixels. */
function decodePng(png: Buffer) {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let width = 0;
  let height = 0;
  let palette: Buffer = Buffer.alloc(0);
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const len = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(1);
      expect(data[9]).toBe(3);
    }
    if (type === "PLTE") palette = data;
    if (type === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = Math.ceil(width / 8);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (rowBytes + 1)]).toBe(0); // filter type
    for (let x = 0; x < width; x++) {
      const bit = (raw[y * (rowBytes + 1) + 1 + (x >> 3)] >> (7 - (x & 7))) & 1;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) rgba[i + c] = palette[bit * 3 + c];
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}

describe("saved QR codes", () => {
  it("the email image scans back to exactly the text that was saved", () => {
    for (const text of [BANK_QR, "https://pay.example.com/ana?amount=12.50", "x".repeat(700), "Ana — Raast ✓"]) {
      const { width, height, rgba } = decodePng(qrPng(text));
      expect(jsQR(rgba, width, height)?.data, text.slice(0, 20)).toBe(text);
    }
  });

  it("draws the rounded version from the same grid, with three eyes and no gaps in size", () => {
    const grid = qrModules(BANK_QR);
    expect(grid.length).toBeGreaterThanOrEqual(21);
    expect(grid.every((row) => row.length === grid.length)).toBe(true);
    // The three finder corners are solid at their centres.
    const n = grid.length;
    for (const [r, c] of [[3, 3], [3, n - 4], [n - 4, 3]]) expect(grid[r][c]).toBe(true);

    const art = qrArt(BANK_QR);
    expect(art.size).toBe(n);
    expect(art.path.startsWith("M")).toBe(true);
    const svg = qrSvg(BANK_QR);
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain(`viewBox="0 0 ${n + 6} ${n + 6}"`);
  });

  it("refuses nothing silently: the same text always gives the same picture", () => {
    expect(qrSvg(BANK_QR)).toBe(qrSvg(BANK_QR));
    expect(qrPng(BANK_QR).equals(qrPng(BANK_QR))).toBe(true);
  });
});
