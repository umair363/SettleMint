import { api } from "@/lib/api";

/**
 * Web Push on this device. iPhones and iPads only allow it once the app is
 * added to the Home Screen, so that case gets its own state.
 */
export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** The active worker's registration, or null when there is none (e.g. dev mode). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // The worker may still be registering on first load; give it a moment.
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 3000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return isIos() && !standalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  if (!reg) return "unsupported";
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ask permission, subscribe this browser and tell the server. */
export async function enablePush(): Promise<PushState> {
  const reg = await registration();
  if (!reg) return "unsupported";
  const { publicKey } = await api.push.key();
  if (!publicKey) throw new Error("PUSH_UNAVAILABLE");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  }
  const json = sub.toJSON();
  await api.push.subscribe({ endpoint: sub.endpoint, keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! } });
  return "on";
}

/** Stop notifications on this device. Never throws: also used on sign-out. */
export async function disablePush(): Promise<void> {
  try {
    const sub = await (await registration())?.pushManager.getSubscription();
    if (!sub) return;
    await api.push.unsubscribe(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe();
  } catch {
    // Nothing more to do; the server forgets dead subscriptions on its own.
  }
}
