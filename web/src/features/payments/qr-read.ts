import { QR_MAX_LENGTH } from "@settlemint/shared";

/**
 * Reads the text out of the QR code in a picture (a screenshot or photo of the
 * code from a banking or wallet app). Returns null when no code is found.
 * Runs on the device: the picture itself is never uploaded.
 */
export async function readQrFromFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) return null;
  const bitmap = await decode(file);
  if (!bitmap) return null;

  // The phone's own detector first, where it exists: it copes best with photos.
  try {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(i: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (Detector) {
      const found = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      const text = found[0]?.rawValue;
      if (text && text.length <= QR_MAX_LENGTH) return text;
    }
  } catch {
    // Not supported for this image: fall through to the library.
  }

  const { default: jsQR } = await import("jsqr");
  // Different sizes find codes the first pass misses (very large screenshots, small photos).
  for (const max of [1400, 900, 600, 2000]) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
    if (hit?.data && hit.data.length <= QR_MAX_LENGTH) return hit.data;
  }
  return null;
}

async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}
