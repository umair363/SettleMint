import type { Recap } from "@settlemint/client/data/recap";

export interface RecapImageText {
  title: string;
  total: string;
  count: string;
  where: string;
  whoPaid: string;
  rows: { label: string; value: string; share: number }[];
  payers: { label: string; value: string; share: number }[];
}

/** Draw the recap as a 1080×1350 picture people can post or send. Plain canvas: no libraries, nothing leaves the device. */
export async function drawRecapImage(text: RecapImageText): Promise<Blob> {
  const W = 1080;
  const ROW = 112;
  const cats = text.rows.slice(0, 5);
  const payers = text.payers.slice(0, 4);
  // As tall as the content needs (at least a 4:5 portrait), so nothing is ever cut off.
  const H = Math.max(1350, 480 + 2 * 110 + (cats.length + payers.length) * ROW + 170);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const style = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const bg = color("--bg", "#f7faf8");
  const fg = color("--fg", "#131c18");
  const muted = color("--fg-muted", "#4e5854");
  const accent = color("--accent", "#4fdaa3");
  const track = color("--surface-3", "#e3e9e6");
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  await document.fonts?.ready;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  const rtl = document.documentElement.dir === "rtl";
  ctx.direction = rtl ? "rtl" : "ltr";
  const left = rtl ? W - 80 : 80;
  ctx.textAlign = rtl ? "right" : "left";
  const font = (px: number, weight = 600) => `${weight} ${px}px ${family}`;

  ctx.fillStyle = muted;
  ctx.font = font(40, 560);
  ctx.fillText(text.title, left, 150);
  ctx.fillStyle = fg;
  ctx.font = font(150, 680);
  ctx.fillText(text.total, left, 310);
  ctx.fillStyle = muted;
  ctx.font = font(38, 500);
  ctx.fillText(text.count, left, 380);

  let y = 470;
  const section = (heading: string, rows: { label: string; value: string; share: number }[]) => {
    ctx.fillStyle = muted;
    ctx.font = font(36, 600);
    ctx.fillText(heading, left, y);
    y += 40;
    for (const r of rows) {
      ctx.fillStyle = fg;
      ctx.font = font(42, 560);
      ctx.fillText(r.label, left, y + 56);
      ctx.textAlign = rtl ? "left" : "right";
      ctx.fillText(r.value, rtl ? 80 : W - 80, y + 56);
      ctx.textAlign = rtl ? "right" : "left";
      const x = 80;
      const w = W - 160;
      const bar = (fill: string, width: number) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(rtl ? x + w - width : x, y + 84, width, 22, 11);
        ctx.fill();
      };
      bar(track, w);
      bar(accent, Math.max(22, w * r.share));
      y += ROW;
    }
    y += 70;
  };
  section(text.where, cats);
  section(text.whoPaid, payers);

  ctx.fillStyle = muted;
  ctx.font = font(34, 560);
  ctx.textAlign = "center";
  ctx.fillText("SettleMint", W / 2, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

export type { Recap };
