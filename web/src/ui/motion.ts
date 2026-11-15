import type { Transition } from "motion/react";

// One small set of motion presets so the whole app moves the same way.
// Components should use these instead of inventing their own timings.

/** Snappy spring for presses, toggles and indicators. */
export const springSnappy: Transition = { type: "spring", stiffness: 520, damping: 36, mass: 0.7 };
/** Softer spring for things that travel: sheets, morphs, list reordering. */
export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 };
/** For opacity-only changes. */
export const fade: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

export const pressable = {
  whileTap: { scale: 0.97 },
  transition: springSnappy,
} as const;

/** Stagger children in lists, a few frames apart. */
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};
export const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Light haptic tick on devices that support it. */
export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw when called without a user gesture.
    }
  }
}
