"use client";

import type { ReactNode } from "react";
import { Logo } from "@/features/shell/logo";

/** Centred column used by sign-in, welcome and join. */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10">
      <header>
        <Logo className="relative mb-10" />
      </header>
      <main className="relative w-full max-w-sm">{children}</main>
      {footer && <footer className="relative mt-auto pt-10 text-center text-xs text-fg-subtle">{footer}</footer>}
    </div>
  );
}
