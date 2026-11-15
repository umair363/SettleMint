"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Logo } from "@/features/shell/app-shell";
import { springSoft } from "@/ui/motion";

/** Centred column used by sign-in, welcome and join. */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10">
      <Logo className="relative mb-10" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSoft}
        className="relative w-full max-w-sm"
      >
        {children}
      </motion.div>
      {footer && <div className="relative mt-auto pt-10 text-center text-xs text-fg-subtle">{footer}</div>}
    </div>
  );
}
