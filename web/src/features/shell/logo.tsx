import { cn } from "@/ui/cn";

/** The SettleMint mark and word. Dependency-free so public pages stay light. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent text-accent-fg shadow-lift">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M5 12.5 10 17 19 7.5" />
        </svg>
      </span>
      SettleMint
    </span>
  );
}
