"use client";

import { motion, useReducedMotion } from "motion/react";
import { easeOutExpo } from "./motion";

/**
 * Shown when a payment brings you to zero in a group. It happens rarely,
 * which is exactly when a small moment of delight is earned.
 */
export function SettledCheck() {
  const reduced = useReducedMotion();
  return (
    <motion.span
      role="status"
      initial={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: easeOutExpo }}
      className="inline-flex items-center gap-2 rounded-full bg-positive-soft py-1.5 pe-3.5 ps-1.5 text-sm font-semibold text-positive"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path
            d="M5 12.5 10 17 19 7.5"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.15, ease: easeOutExpo }}
          />
        </svg>
      </span>
      All settled up
    </motion.span>
  );
}
