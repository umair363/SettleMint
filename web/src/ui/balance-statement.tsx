import type { ReactNode } from "react";
import { cn } from "./cn";
import { Money } from "./money";

/**
 * Where you stand, said as a sentence set on the canvas: a label, the amount
 * in expanded figures that roll when it changes, and one line of context.
 * No card and no tint: the type carries it. Other currencies follow as quiet
 * ledger lines (children).
 */
export function BalanceStatement({
  label,
  minor,
  currency,
  context,
  settledText,
  children,
  className,
  size = "lg",
}: {
  label: ReactNode;
  minor: number;
  currency: string;
  /** One line under the amount, e.g. "across 3 groups". */
  context?: ReactNode;
  /** Shown instead of the amount when the balance is zero. */
  settledText?: ReactNode;
  children?: ReactNode;
  className?: string;
  size?: "lg" | "md";
}) {
  const settled = minor === 0 && settledText;
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[17px] leading-snug text-fg-muted">{label}</p>
      {settled ? (
        <p className="mt-1 font-wider text-[34px] font-[620] leading-[1.05] tracking-[-0.03em] text-fg">{settledText}</p>
      ) : (
        <p
          className={cn(
            "mt-1 font-wider font-[620] leading-none tracking-[-0.03em]",
            size === "lg" ? "text-[48px] sm:text-[56px]" : "text-[40px]",
          )}
        >
          <Money minor={minor} currency={currency} tone="auto" absolute animated />
        </p>
      )}
      {context && <p className="mt-2.5 text-[15px] leading-snug text-fg-muted">{context}</p>}
      {children}
    </div>
  );
}

/** A secondary currency under the statement: "£732.14  you owe". */
export function LedgerLine({ children }: { children: ReactNode }) {
  return <p className="flex items-baseline gap-2 text-[15px] leading-snug text-fg-muted">{children}</p>;
}
