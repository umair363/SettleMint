"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "use-intl";
import { easeOutExpo } from "./motion";

/**
 * How much of what the group spent has already been squared away: the amount
 * still to be paid back against everything spent. It fills as people settle,
 * and becomes a check when nothing is owed.
 */
export function SettleRing({ outstanding, spent }: { outstanding: number; spent: number }) {
  const t = useTranslations("group");
  const reduced = useReducedMotion();
  if (spent <= 0) return null;
  const progress = Math.max(0, Math.min(1, 1 - outstanding / spent));
  const percent = Math.floor(progress * 100);
  const done = outstanding === 0;
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={t("settleProgress", { percent: done ? 100 : percent })} className="relative size-[60px] shrink-0">
      <svg viewBox="0 0 60 60" className="size-full -rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" className="stroke-surface-3" />
        <motion.circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduced ? c * (1 - progress) : c }}
          animate={{ strokeDashoffset: c * (done ? 0 : 1 - progress) }}
          transition={{ duration: 0.7, ease: easeOutExpo }}
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[13px] font-[650] tabular-nums text-fg">
        {done ? (
          <svg viewBox="0 0 24 24" className="size-5 text-positive" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17 19 7.5" />
          </svg>
        ) : (
          `${percent}%`
        )}
      </span>
    </div>
  );
}
