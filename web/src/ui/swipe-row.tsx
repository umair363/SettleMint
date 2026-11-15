"use client";

import { Trash2 } from "lucide-react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useRef, type ReactNode } from "react";
import { haptic } from "./motion";

const REVEAL = 88; // px of the action shown when resting open
const COMMIT = 150; // swipe further than this to act straight away

/**
 * Swipe left to reveal a destructive action (phones). A long swipe commits
 * at once; a short one leaves the button showing. Taps still open the row.
 * Always paired with a non-gesture route (the detail sheet's Delete button)
 * for keyboard and screen-reader users.
 */
export function SwipeRow({
  children,
  onAction,
  actionLabel = "Delete",
  disabled,
}: {
  children: ReactNode;
  onAction: () => void;
  actionLabel?: string;
  disabled?: boolean;
}) {
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const actionOpacity = useTransform(x, [-REVEAL, -24, 0], [1, 0.4, 0]);
  const actionScale = useTransform(x, [-COMMIT, -REVEAL, 0], [1.08, 1, 0.8]);

  const settle = (to: number) => animate(x, to, { type: "spring", stiffness: 600, damping: 45 });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset < -COMMIT || info.velocity.x < -900) {
      haptic([8, 30, 8]);
      settle(-400);
      onAction();
    } else if (offset < -REVEAL / 2) {
      settle(-REVEAL);
    } else {
      settle(0);
    }
  };

  if (disabled) return <>{children}</>;

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
          {actionLabel}
        </motion.span>
      </motion.button>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -COMMIT - 40, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
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
