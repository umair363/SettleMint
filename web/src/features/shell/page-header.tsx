"use client";

import { ChevronLeft } from "@/ui/icons";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/ui/cn";

/**
 * Top of every in-app screen: a large title that, once scrolled away, hands
 * over to a compact glass bar holding the title and the back link (the system
 * pattern for top-level screens).
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  leading,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** A mark before the title (e.g. the group's icon). */
  leading?: ReactNode;
  className?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden={!compact}
        inert={!compact}
        className={cn(
          "glass safe-top fixed inset-x-0 top-0 z-30 transition-[opacity,transform] duration-[var(--dur-state)] ease-[var(--ease-standard)] lg:start-[272px]",
          compact ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-3 sm:px-5">
          <div className="flex w-1/4 min-w-0">
            {back && (
              <Link href={back.href} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 text-[15px] font-[560] text-positive">
                <ChevronLeft className="size-[18px] rtl:rotate-180" aria-hidden />
                <span className="truncate">{back.label}</span>
              </Link>
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-center text-[17px] font-[620]">{title}</p>
          <div className="flex w-1/4 justify-end">{actions && <div className="flex items-center gap-1">{actions}</div>}</div>
        </div>
      </div>

      <header className={cn("safe-top mx-auto w-full max-w-3xl px-5 pb-3 pt-6 sm:px-6 lg:pt-12", className)}>
        <div className="flex min-h-11 items-center justify-between gap-3">
          {back ? (
            <Link
              href={back.href}
              className="-ms-2 inline-flex items-center gap-0.5 rounded-full py-1.5 pe-2 ps-1 text-[15px] font-[560] text-positive hover:bg-surface-2"
            >
              <ChevronLeft className="size-[18px] rtl:rotate-180" aria-hidden />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
        <div className="mt-1 flex items-center gap-3.5">
          {leading}
          <div className="min-w-0">
            <h1 className="font-wide text-[32px] font-[650] leading-[1.08] tracking-[-0.025em] text-balance">{title}</h1>
            {subtitle && <div className="mt-1.5 text-[15px] text-fg-muted">{subtitle}</div>}
          </div>
        </div>
        <div ref={sentinel} className="h-px" />
      </header>
    </>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-3xl space-y-9 px-5 pt-3 sm:px-6", className)}>{children}</main>;
}
