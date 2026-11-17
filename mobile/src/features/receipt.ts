import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const MAX_SIDE = 1600;

/**
 * Take or choose a receipt photo and shrink it: receipts stay perfectly
 * readable at 1600 px, the upload is a fraction of the size, and less of the
 * person's data leaves the phone. Null if they cancelled or said no to the camera.
 */
export async function pickReceiptPhoto(source: "camera" | "library"): Promise<{ data: string; mimeType: "image/jpeg" } | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const photo = result.assets[0];
  const longest = Math.max(photo.width, photo.height);
  const resize =
    longest > MAX_SIDE ? [{ resize: photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE } }] : [];
  const out = await manipulateAsync(photo.uri, resize, { compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) return null;
  return { data: out.base64, mimeType: "image/jpeg" };
}
