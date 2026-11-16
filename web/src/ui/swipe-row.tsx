"use client";

import { Trash2 } from "lucide-react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";
import { dirOf, matchLanguage } from "@/i18n/languages";
import { haptic } from "./motion";

const REVEAL = 88; // px of the action shown when resting open
const COMMIT = 150; // swipe further than this to act straight away

/**
 * Swipe toward the start edge (left; right in Arabic and Urdu) to reveal a
 * destructive action on phones. A long swipe commits at once; a short one
 * leaves the button showing. Taps still open the row. Always paired with a
 * non-gesture route (the detail sheet's Delete button) for keyboard and
 * screen-reader users.
 */
export function SwipeRow({
  children,
  onAction,
  actionLabel,
  disabled,
}: {
  children: ReactNode;
  onAction: () => void;
  actionLabel?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("ui");
  const label = actionLabel ?? t("delete");
  // The action sits at the end edge, so the row moves toward the start edge.
  const out = dirOf(matchLanguage([useLocale()])) === "rtl" ? 1 : -1;
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const revealed = useTransform(x, (v) => Math.max(0, v * out));
  const actionOpacity = useTransform(revealed, [0, 24, REVEAL], [0, 0.4, 1]);
  const actionScale = useTransform(revealed, [0, REVEAL, COMMIT], [0.8, 1, 1.08]);

  const settle = (to: number) => animate(x, to, { type: "spring", stiffness: 600, damping: 45 });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x * out;
    if (offset > COMMIT || info.velocity.x * out > 900) {
      haptic([8, 30, 8]);
      settle(out * 400);
      onAction();
    } else if (offset > REVEAL / 2) {
      settle(out * REVEAL);
    } else {
      settle(0);
    }
  };

  if (disabled) return <>{children}</>;

  const reach = COMMIT + 40;
  return (
    <div className="relative overflow-hidden">
      <motion.button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => {
          haptic(8);
          onAction();
        }}
        style={{ opacity: actionOpacity }}
        className="absolute inset-y-0 end-0 flex w-[88px] items-center justify-center bg-negative text-bg"
      >
        <motion.span style={{ scale: actionScale }} className="flex flex-col items-center gap-0.5 text-xs font-semibold">
          <Trash2 className="size-5" />
          {label}
        </motion.span>
      </motion.button>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={out < 0 ? { left: -reach, right: 0 } : { left: 0, right: reach }}
        dragElastic={out < 0 ? { left: 0.15, right: 0 } : { left: 0, right: 0.15 }}
        dragMomentum={false}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          // A drag must not also count as a tap on the row underneath.
          if (dragged.current) {
            e.stopPropagation();
            e.preventDefault();
            dragged.current = false;
          }
        }}
        className="relative bg-surface"
      >
        {children}
      </motion.div>
    </div>
  );
}
