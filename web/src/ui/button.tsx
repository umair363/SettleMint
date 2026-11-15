"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "./cn";
import { springSnappy } from "./motion";

const buttonStyles = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
        ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
        danger: "bg-negative-soft text-negative hover:bg-negative hover:text-white",
        outline: "border border-line-strong text-fg hover:bg-surface-2",
      },
      size: {
        sm: "h-9 rounded-[var(--radius-sm)] px-3 text-sm",
        md: "h-11 rounded-[var(--radius-md)] px-4 text-[15px]",
        lg: "h-14 rounded-[var(--radius-lg)] px-6 text-base",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: ["md", "lg"],
        className: "shadow-[0_6px_18px_-10px_color-mix(in_oklab,var(--accent)_70%,transparent)]",
      },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof buttonStyles> {
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, leading, trailing, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={springSnappy}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, block }), className)}
      {...props}
    >
      {loading ? <LoaderCircle className="size-[1.1em] animate-spin" aria-hidden /> : leading}
      {children}
      {!loading && trailing}
    </motion.button>
  );
});

const iconButtonStyles = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-45 disabled:pointer-events-none",
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

export interface IconButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof iconButtonStyles> {
  /** Required: icon-only buttons need a spoken name. */
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, children, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={springSnappy}
      className={cn(iconButtonStyles({ variant, size }), className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});
