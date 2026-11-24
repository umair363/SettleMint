import { qrSvg } from "@settlemint/shared";

const INK = "#0d2a20";
const MUTED = "#4e5854";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A saved QR code as a shareable picture: the code, redrawn sharply, on a
 * white panel over a soft mint card, with its name underneath. The code itself
 * is always dark on white, because that is what scanners read best, whatever
 * theme the app is in.
 */
export async function qrCardBlob(text: string, caption: string, opts: { name?: string; footer?: string } = {}): Promise<Blob> {
  const W = 1080;
  const panelX = 64;
  const panelW = W - panelX * 2;
  const qrSize = panelW - 80;
  const svg = qrSvg(text, { pixels: qrSize });
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const textBlock = (caption ? 96 : 0) + (opts.name ? 60 : 0) + 40;
  const panelH = 40 + qrSize + textBlock + 24;
  const footerH = opts.footer ? 120 : 64;
  const H = 64 + panelH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#c9f3df");
  bg.addColorStop(0.55, "#e8f9f1");
  bg.addColorStop(1, "#f6fcf9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // The white panel, with a soft shadow.
  ctx.save();
  ctx.shadowColor = "rgba(13, 42, 32, 0.18)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundedRect(ctx, panelX, 64, panelW, panelH, 64);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, panelX + 40, 64 + 40, qrSize, qrSize);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = 64 + 40 + qrSize + 24;
  const font = (w: number, px: number) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", "Noto Sans Arabic", "Noto Sans Devanagari", sans-serif`;
  if (caption) {
    ctx.fillStyle = INK;
    ctx.font = font(700, 52);
    ctx.fillText(caption.slice(0, 40), W / 2, y + 36);
    y += 96;
  }
  if (opts.name) {
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 38);
    ctx.fillText(opts.name.slice(0, 40), W / 2, y + 12);
  }
  if (opts.footer) {
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.75;
    ctx.font = font(600, 36);
    ctx.fillText(opts.footer.slice(0, 60), W / 2, 64 + panelH + 60);
    ctx.globalAlpha = 1;
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}

/** Hands the picture to the phone's share sheet (WhatsApp, Messages…), or downloads it where sharing files isn't possible. */
export async function shareOrSaveQr(blob: Blob, name: string, opts: { share: boolean; text?: string }) {
  const file = new File([blob], `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "qr"}.png`, { type: "image/png" });
  if (opts.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], ...(opts.text ? { text: opts.text } : {}) });
      return "shared" as const;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "saved" as const;
}
