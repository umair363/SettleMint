import { qrSvg } from "@settlemint/shared";

const INK = "#0d2a20";

/**
 * A saved QR code as a shareable picture: the code, redrawn sharply, on a
 * plain white card with its name underneath. Dark on white always, because
 * that is what scanners read best, whatever theme the app is in.
 */
export async function qrCardBlob(text: string, caption: string): Promise<Blob> {
  const size = 1000;
  const pad = 40;
  const captionH = caption ? 110 : 0;
  const svg = qrSvg(text, { pixels: size - pad * 2 });
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + captionH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
  if (caption) {
    ctx.fillStyle = INK;
    ctx.font = '600 46px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption.slice(0, 40), size / 2, size + captionH / 2 - 18);
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
