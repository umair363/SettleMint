import { qrArt, QR_QUIET_ZONE } from "@settlemint/shared";
import { forwardRef, useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";

/**
 * A saved payment QR code, redrawn from its text in the app's rounded style.
 * Always dark on white, in light and dark mode alike: banking apps read it best that way.
 */
export const PayQr = forwardRef<Svg, { value: string; label: string; size?: number }>(function PayQr({ value, label, size = 240 }, ref) {
  const art = useMemo(() => qrArt(value), [value]);
  const total = art.size + QR_QUIET_ZONE * 2;
  return (
    <Svg ref={ref} width={size} height={size} viewBox={`0 0 ${total} ${total}`} accessibilityRole="image" accessibilityLabel={label}>
      <Rect width={total} height={total} fill="#ffffff" />
      <Path transform={`translate(${QR_QUIET_ZONE} ${QR_QUIET_ZONE})`} fill="#0d2a20" fillRule="evenodd" d={art.path} />
    </Svg>
  );
});
