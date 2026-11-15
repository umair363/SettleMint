import type { Transition } from "motion/react";

// One small set of motion presets so the whole app moves the same way.
// Components should use these instead of inventing their own timings.

// Timing rules: routine changes 150-300ms, ease-out arrivals, exits faster than
// entrances, no bounce on routine UI, springs so motion can be interrupted,
// and nothing animates for keyboard-driven actions.

/** Snappy, critically damped spring for presses, toggles and indicators (~200ms, no overshoot). */
export const springSnappy: Transition = { type: "spring", stiffness: 600, damping: 45, mass: 0.6 };
/** Travelling things: panels, sheets, list rows (~280ms, settles without wobble). */
export const springSoft: Transition = { type: "spring", stiffness: 420, damping: 40, mass: 0.8 };
/** Confident arrival curve for non-spring transitions. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
/** For opacity-only changes. */
export const fade: Transition = { duration: 0.18, ease: easeOutExpo };

export const pressable = {
  whileTap: { scale: 0.97 },
  transition: springSnappy,
} as const;

/** Stagger children in lists, a few frames apart. */
export const listContainer = {
  hidden: {},
  // Capped: the whole list is in within ~150ms.
  show: { transition: { staggerChildren: 0.025, delayChildren: 0 } },
};
export const listItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: easeOutExpo } },
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
