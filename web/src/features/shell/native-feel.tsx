"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "@/ui/icons";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { haptic } from "@/ui/motion";

/**
 * Screens arrive the way they do in a phone app: drilling into a group slides
 * in from the side, coming back slides the other way, and switching tabs is a
 * quick crossfade. Pure CSS, so it costs no JavaScript and respects
 * "reduce motion".
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [seen, setSeen] = useState({ path: pathname, kind: "tab" as "tab" | "push" | "pop" });
  if (seen.path !== pathname) {
    setSeen({ path: pathname, kind: pathname === "/group" ? "push" : seen.path === "/group" ? "pop" : "tab" });
  }
  return (
    <div key={seen.path} className={`page-${seen.kind}`}>
      {children}
    </div>
  );
}

const TRIGGER = 72;

/**
 * Pull down from the top of a screen to refresh it, like every phone app. Touch
 * only; desktop is unaffected. Ignored while a sheet is open or when the finger
 * moves sideways (swiping a row).
 */
export function PullToRefresh() {
  const qc = useQueryClient();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let x0 = 0;
    let y0: number | null = null;
    let armed = false;
    let distance = 0;

    const onStart = (e: TouchEvent) => {
      const free = window.scrollY <= 0 && e.touches.length === 1 && !document.querySelector("[data-vaul-drawer]");
      y0 = free ? e.touches[0].clientY : null;
      x0 = e.touches[0].clientX;
      armed = false;
      distance = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0;
      const dx = Math.abs(e.touches[0].clientX - x0);
      if (dy < 10 || dx > dy) {
        if (distance) setPull(0);
        distance = 0;
        return;
      }
      distance = Math.min(dy * 0.5, 110);
      setPull(distance);
      if (!armed && distance >= TRIGGER) {
        armed = true;
        haptic(8);
      } else if (armed && distance < TRIGGER) {
        armed = false;
      }
    };
    const onEnd = () => {
      if (y0 === null) return;
      y0 = null;
      if (distance >= TRIGGER) {
        setBusy(true);
        setPull(TRIGGER * 0.7);
        const started = Date.now();
        void qc.refetchQueries({ type: "active" }).finally(() => {
          window.setTimeout(() => {
            setBusy(false);
            setPull(0);
          }, Math.max(0, 600 - (Date.now() - started)));
        });
      } else {
        setPull(0);
      }
      distance = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [qc]);

  if (pull === 0 && !busy) return null;
  const progress = Math.min(1, pull / TRIGGER);
  return (
    <div
      aria-hidden
      className="glass pointer-events-none fixed start-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex size-10 -translate-x-1/2 items-center justify-center rounded-full rtl:translate-x-1/2"
      style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: busy ? 1 : progress }}
    >
      <LoaderCircle
        className={busy ? "size-5 animate-spin text-fg-muted" : "size-5 text-fg-muted"}
        style={busy ? undefined : { transform: `rotate(${progress * 270}deg)` }}
      />
    </div>
  );
}
