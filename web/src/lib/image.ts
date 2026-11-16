/**
 * Shrink a photo before upload: receipts stay perfectly readable at 1600 px,
 * the upload is a fraction of the size, and less of the person's data leaves
 * the device. Returns base64 JPEG without the data: prefix.
 */
export async function prepareReceiptImage(file: File, maxSide = 1600): Promise<{ data: string; mimeType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Can't process images on this device");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't compress the photo"))), "image/jpeg", 0.8),
  );
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  return { data: btoa(binary), mimeType: "image/jpeg" };
}
