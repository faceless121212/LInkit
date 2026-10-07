import { cn } from "cn";

/**
 * Linkit mark: an "L" whose foot hooks into an open link ring.
 * Pass `tone="mono"` to draw it in currentColor (e.g. inside a filled tile).
 */
export function LogoMark({
  size = 24,
  tone = "gradient",
  className,
}: {
  size?: number;
  tone?: "gradient" | "mono";
  className?: string;
}) {
  const stroke = tone === "mono" ? "currentColor" : "url(#linkit-g)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
    >
      {tone === "gradient" && (
        <defs>
          <linearGradient id="linkit-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 7v25a5 5 0 0 0 5 5h10"
        fill="none"
        stroke={stroke}
        strokeWidth={tone === "mono" ? 6.5 : 5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 29.5a7.5 7.5 0 1 1 0 15"
        fill="none"
        stroke={stroke}
        strokeWidth={tone === "mono" ? 6.5 : 5.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + wordmark, for the sidebar and headers. */
export function Logo({ className, markSize = 26 }: { className?: string; markSize?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-heading text-[15px] font-semibold tracking-tight", className)}>
      <LogoMark size={markSize} />
      Linkit
    </span>
  );
}

/** Filled tile with the mono mark, for splash-style placements like the login page. */
export function LogoTile({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-primary/30",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.62)} tone="mono" />
    </span>
  );
}
