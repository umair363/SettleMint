"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

/** Top of every in-app screen: big title on phones, compact with a back link when nested. */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("safe-top mx-auto w-full max-w-3xl px-4 pb-2 pt-7 sm:px-6 lg:pt-10", className)}>
      {back && (
        <Link
          href={back.href}
          className="-ms-1.5 mb-2 inline-flex items-center gap-0.5 rounded-full py-1 pe-2 text-sm font-medium text-fg-muted hover:text-fg"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1 text-[15px] text-fg-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-3xl space-y-6 px-4 pt-2 sm:px-6", className)}>{children}</main>;
}
