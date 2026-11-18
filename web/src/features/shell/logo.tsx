import { cn } from "@/ui/cn";

/**
 * The SettleMint mark: an equals sign whose upper bar is completed by a dot,
 * a balance settling. Dependency-free so public pages stay light.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-fg", className)}>
      <svg viewBox="0 0 24 24" className="size-[70%]" fill="currentColor" aria-hidden>
        <rect x="5" y="7.75" width="9" height="3.5" rx="1.75" />
        <circle cx="17.25" cy="9.5" r="1.75" />
        <rect x="5" y="12.75" width="14" height="3.5" rx="1.75" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-wide text-[19px] font-[660] tracking-[-0.02em] text-fg", className)}>
      <LogoMark />
      SettleMint
    </span>
  );
}
