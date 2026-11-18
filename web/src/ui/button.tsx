import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "@/ui/icons";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// Pills, like the system's own buttons. Press feedback is pure CSS (interruptible,
// on the compositor): a 90 ms dip of 1.5% and one pixel. Hover only changes fill.
const press =
  "transition-[transform,background-color,color,box-shadow] duration-[var(--dur-press)] ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.985]";

const buttonStyles = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-[590] tracking-[-0.005em]",
    press,
    "disabled:pointer-events-none aria-busy:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        // The one filled action on a screen. Disabled stays legible: it says
        // "not yet", not "broken".
        primary: "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-surface-3 disabled:text-fg-muted",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3 disabled:text-fg-subtle",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg disabled:text-fg-subtle",
        danger: "bg-danger-soft text-danger hover:bg-danger hover:text-bg disabled:opacity-50",
        outline: "text-fg shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2 disabled:text-fg-subtle",
      },
      size: {
        sm: "h-9 px-3.5 text-[14px]",
        md: "h-11 px-5 text-[15px]",
        lg: "h-[52px] px-6 text-[17px]",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, leading, trailing, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, block }), className)}
      {...props}
    >
      {loading ? <LoaderCircle className="size-[1.1em] animate-spin" aria-hidden /> : leading}
      {children}
      {!loading && trailing}
    </button>
  );
});

const iconButtonStyles = cva(
  [
    "inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-45 disabled:pointer-events-none",
    "transition-[transform,background-color,color] duration-[var(--dur-press)] ease-[var(--ease-standard)] active:scale-[0.94]",
  ],
  {
    variants: {
      variant: {
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        solid: "bg-surface-2 text-fg hover:bg-surface-3",
        glass: "glass text-fg",
        accent: "bg-accent text-accent-fg hover:bg-accent-hover",
      },
      size: { sm: "size-9 [&_svg]:size-[18px]", md: "size-11 [&_svg]:size-5", lg: "size-14 [&_svg]:size-6" },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonStyles> {
  /** Required: icon-only buttons need a spoken name. */
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(iconButtonStyles({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
});
