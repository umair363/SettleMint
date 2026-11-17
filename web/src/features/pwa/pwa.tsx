"use client";

import { CloudOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { springSoft } from "@/ui/motion";
import { tr } from "@settlemint/client/i18n/runtime";
import { useTranslations } from "use-intl";

/** Registers the service worker and offers a reload when a new version is ready. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reloading = false;
    // On the very first visit the new worker takes control too; only reload
    // when an older version is being replaced, never mid-way through a first visit.
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const offerUpdate = (worker: ServiceWorker) =>
      toast(tr()("pwa.updateReady"), {
        id: "sw-update",
        duration: Infinity,
        action: { label: tr()("pwa.update"), onClick: () => worker.postMessage("SKIP_WAITING") },
      });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });
        // Check for a new version when the app comes back to the foreground.
        const onVisible = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        // Not fatal: the app works without offline support.
      });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);
  return null;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Small pill at the top while offline; everything keeps working from saved data. */
export function OfflineBanner() {
  const online = useOnline();
  const t = useTranslations("ui");
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={springSoft}
          className="glass fixed start-1/2 top-[max(env(safe-area-inset-top),0.75rem)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium shadow-float rtl:translate-x-1/2"
        >
          <CloudOff className="size-4 text-info" aria-hidden />
          {t("offline")}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Install ───────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((l) => l());
  });
}

function subscribeInstall(cb: () => void) {
  installListeners.add(cb);
  return () => installListeners.delete(cb);
}

export type InstallState = "installed" | "prompt" | "ios" | "unavailable";

function installState(): InstallState {
  const standalone =
    matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (standalone) return "installed";
  if (deferredPrompt) return "prompt";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "unavailable";
}

export function useInstall() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => "unavailable" as const);
  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((l) => l());
  };
  return { state, install };
}
