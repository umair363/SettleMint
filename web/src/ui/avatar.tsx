import { cn } from "./cn";

// Hues picked to be distinct from each other and readable with white text
// on both themes. Chosen by id, so a person keeps their colour everywhere.
const HUES = [152, 205, 262, 330, 24, 45, 188, 290, 352, 98];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
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

export function Avatar({ id, name, image, size = "md", pending, className }: AvatarProps) {
  const hue = HUES[hash(id) % HUES.length];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        sizes[size],
        pending && "outline-2 outline-offset-1 outline-dashed outline-line-strong",
        className,
      )}
      // OKLCH keeps every hue at the same perceived lightness, so white
      // initials stay above 4.5:1 contrast for all of them (HSL yellows didn't).
      style={{ background: `linear-gradient(135deg, oklch(0.52 0.13 ${hue}), oklch(0.43 0.12 ${(hue + 28) % 360}))` }}
      aria-hidden
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimisation
        <img src={image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
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
    <span className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} {...p} size={size} className="ring-2 ring-bg" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-3 font-semibold text-fg-muted ring-2 ring-bg",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
