import { identityHue } from "@settlemint/client/design/tokens";
import type { CSSProperties } from "react";
import { cn } from "./cn";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[12px]",
  md: "size-10 text-[14px]",
  lg: "size-14 text-[19px]",
  xl: "size-20 text-[26px]",
} as const;

export interface AvatarProps {
  id: string;
  name: string;
  image?: string | null;
  size?: keyof typeof sizes;
  /** Dashed ring for someone added by name who hasn't joined yet. */
  pending?: boolean;
  className?: string;
}

/**
 * A monogram on the person's own colour: one of eight quiet hues chosen by id,
 * flat (no gradient), kept clear of the mint and ember used for balances.
 */
export function Avatar({ id, name, image, size = "md", pending, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "identity relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-wide font-[640] tracking-[0.01em]",
        sizes[size],
        pending && "outline-[1.5px] outline-offset-2 outline-dashed outline-line-strong",
        className,
      )}
      style={{ "--id-h": identityHue(id) } as CSSProperties}
      aria-hidden
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimisation
        <img src={image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        // Small sizes carry one letter; two would crowd the circle.
        size === "xs" || size === "sm" ? Array.from(initials(name))[0] : initials(name)
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { id: string; name: string; image?: string | null }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5 rtl:space-x-reverse">
      {shown.map((p) => (
        <Avatar key={p.id} {...p} size={size} className="ring-2 ring-bg" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-2 font-[600] text-fg-muted ring-2 ring-bg",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
