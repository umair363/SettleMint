"use client";

import { motion } from "motion/react";
import { Switch as RadixSwitch, ToggleGroup } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "./cn";
import { haptic, springSnappy } from "./motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/**
 * Pick one of a few options. The highlight slides between options
 * (a shared-layout morph), and arrow keys move between them.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const layoutId = useId();
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) {
          haptic(6);
          onChange(v as T);
        }
      }}
      aria-label={label}
      className={cn("inline-flex w-full rounded-[var(--radius-md)] bg-surface-2 p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-md)-4px)] font-medium transition-colors",
              size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-3 text-sm",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={springSnappy}
                className="absolute inset-0 rounded-[inherit] border border-line bg-surface shadow-soft"
                aria-hidden
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5 [&_svg]:size-4">
              {o.icon}
              {o.label}
            </span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[15px] font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-fg-muted">{description}</span>}
      </label>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => {
          haptic(6);
          onCheckedChange(v);
        }}
        className="relative h-7 w-12 shrink-0 rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-accent disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow-soft transition-transform duration-200 ease-[var(--ease-spring)] data-[state=checked]:translate-x-[1.375rem] rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[1.375rem]" />
      </RadixSwitch.Root>
    </div>
  );
}

/** Selectable chip, e.g. picking who was part of an expense. */
export function Chip({
  selected,
  onToggle,
  children,
  leading,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        haptic(6);
        onToggle();
      }}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border ps-1.5 pe-3.5 text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-95",
        selected
          ? "border-accent bg-accent-soft text-fg"
          : "border-line bg-surface-2 text-fg-muted hover:text-fg",
        !leading && "ps-3.5",
      )}
    >
      {leading}
      {children}
    </button>
  );
}
