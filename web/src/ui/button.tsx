import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// Press feedback is pure CSS: transitions are interruptible, run on the
// compositor, and keep the animation library out of pages that don't need it.
const press = "transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.97]";

const buttonStyles = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold",
    press,
    "disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
        ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
        danger: "bg-negative-soft text-negative hover:bg-negative hover:text-bg",
        outline: "border border-line-strong text-fg hover:bg-surface-2",
      },
      size: {
        sm: "h-9 rounded-[var(--radius-sm)] px-3 text-sm",
        md: "h-11 rounded-[var(--radius-md)] px-4 text-[15px]",
        lg: "h-14 rounded-[var(--radius-lg)] px-6 text-base",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [{ variant: "primary", size: ["md", "lg"], className: "shadow-lift" }],
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
    "transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.92]",
  ],
  {
    variants: {
      variant: {
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        solid: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
        accent: "bg-accent text-accent-fg hover:bg-accent-hover",
      },
      size: { sm: "size-9", md: "size-11", lg: "size-14" },
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
