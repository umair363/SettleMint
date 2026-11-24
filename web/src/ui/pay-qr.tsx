"use client";

import { qrArt, QR_QUIET_ZONE } from "@settlemint/shared";
import { useMemo } from "react";
import { cn } from "./cn";

/**
 * A saved payment QR code, redrawn from its text in the app's rounded style.
 * Always dark on white, in light and dark mode alike: that is what banking
 * apps read best.
 */
export function PayQr({ value, label, size = 240, className }: { value: string; label: string; size?: number; className?: string }) {
  const art = useMemo(() => qrArt(value), [value]);
  const total = art.size + QR_QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="geometricPrecision"
      className={cn("block max-w-full rounded-[1.25rem] bg-white", className)}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path transform={`translate(${QR_QUIET_ZONE} ${QR_QUIET_ZONE})`} fill="#0d2a20" fillRule="evenodd" d={art.path} />
    </svg>
  );
}
