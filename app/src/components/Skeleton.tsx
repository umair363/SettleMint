export default function Skeleton({ width, height, borderRadius, style, className }: { width?: string, height?: string, borderRadius?: string, style?: React.CSSProperties, className?: string }) {
  return (
    <div 
      className={`skeleton-loader ${className || ""}`}
      style={{
        width: width || "100%",
        height: height || "1rem",
        borderRadius: borderRadius || "8px",
        ...style
      }}
    />
  );
}
