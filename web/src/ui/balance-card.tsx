import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The card that shows where you stand. Its tint says it before you read it:
 * mint when you're owed, coral when you owe, neutral when settled. Colour
 * with meaning, instead of a decorative glow.
 */
export function BalanceCard({ balance, children, className }: { balance: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-6 shadow-soft transition-colors duration-300",
        balance > 0 &&
          "border-[color-mix(in_oklab,var(--positive)_24%,transparent)] bg-[color-mix(in_oklab,var(--positive)_7%,var(--surface))]",
        balance < 0 &&
          "border-[color-mix(in_oklab,var(--negative)_24%,transparent)] bg-[color-mix(in_oklab,var(--negative)_6%,var(--surface))]",
        balance === 0 && "border-line bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}
