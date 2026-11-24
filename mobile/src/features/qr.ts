import { QR_MAX_LENGTH } from "@settlemint/shared";
import { scanFromURLAsync } from "expo-camera";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import type Svg from "react-native-svg";

/**
 * Lets the person pick a screenshot or photo of the QR code from their bank or
 * wallet app and reads the text out of it, on the phone. Returns null when they
 * cancel or no code is found; the picture is never uploaded.
 */
export async function pickQrFromPhotos(): Promise<{ text: string | null; cancelled: boolean }> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
  if (result.canceled || !result.assets[0]) return { text: null, cancelled: true };
  try {
    const found = await scanFromURLAsync(result.assets[0].uri, ["qr"]);
    const text = found.find((f) => f.data)?.data ?? null;
    return { text: text && text.length <= QR_MAX_LENGTH ? text : null, cancelled: false };
  } catch {
    return { text: null, cancelled: false };
  }
}

/** Hands a drawn QR to the phone's share sheet as a picture (WhatsApp, Messages, Save to Photos…). */
export function shareQrImage(svg: Svg, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    svg.toDataURL(
      async (base64: string) => {
        try {
          const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
          const safe = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "qr";
          const file = new File(Paths.cache, `${safe}.png`);
          if (file.exists) file.delete();
          file.create();
          file.write(bytes);
          await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png" });
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      { width: 1000, height: 1000 },
    );
  });
}
