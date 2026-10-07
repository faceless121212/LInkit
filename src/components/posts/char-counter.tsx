"use client";

import { cn } from "cn";
import { countXText, X_MAX_WEIGHTED_LENGTH } from "@/lib/x-text";

export function CharCounter({ text, className }: { text: string; className?: string }) {
  const { weightedLength, valid } = countXText(text);
  const pct = Math.min(weightedLength / X_MAX_WEIGHTED_LENGTH, 1);
  const r = 8;
  const c = 2 * Math.PI * r;
  const warn = valid && weightedLength > X_MAX_WEIGHTED_LENGTH - 20;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        !valid ? "text-destructive" : warn ? "text-amber-600" : "text-muted-foreground",
        className,
      )}
      aria-live="polite"
      title="Weighted characters, counted the way X does"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
        />
      </svg>
      <span data-testid="char-count">
        {weightedLength} / {X_MAX_WEIGHTED_LENGTH}
      </span>
    </span>
  );
}
