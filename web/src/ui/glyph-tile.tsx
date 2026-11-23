import { categoryGlyph, groupGlyph } from "@settlemint/client/design/glyphs";
import { identityHue } from "@settlemint/client/design/tokens";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";
import { Glyph } from "./icons";

const sizes = {
  sm: "size-8 rounded-[10px] [&_svg]:size-[18px]",
  md: "size-10 rounded-[var(--radius-sm)] [&_svg]:size-[22px]",
  lg: "size-14 rounded-[var(--radius-md)] [&_svg]:size-7",
} as const;

/** A group's mark: what kind of group it is, on the group's own quiet colour. */
export function GroupMark({ id, type, size = "md", className }: { id: string; type: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("identity inline-flex shrink-0 items-center justify-center", sizes[size], className)}
      style={{ "--id-h": identityHue(id) } as CSSProperties}
    >
      <Glyph name={groupGlyph(type).web} />
    </span>
  );
}

/** A settings row's icon: neutral tile, so colour stays reserved for balances and warnings. */
export function IconTile({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] [&>svg]:size-5",
        tone === "danger" ? "bg-negative-soft text-negative" : "bg-surface-2 text-fg-muted",
      )}
    >
      {children}
    </span>
  );
}

/** What an expense was for, on a neutral tile (colour is kept for balances). */
export function CategoryTile({ category, size = "md", className }: { category: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center bg-surface-2 text-fg-muted", sizes[size], className)}>
      <Glyph name={categoryGlyph(category).web} />
    </span>
  );
}
