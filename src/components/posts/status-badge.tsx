import { cn } from "cn";
import { STATUS_LABELS, type PostStatus } from "@/lib/types";

const STYLES: Record<PostStatus, string> = {
  idea: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tracking-wide", STYLES[status], className)}
      data-testid="status-badge"
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Typefully-style tag chip tinted with the pillar colour. */
export function PillarChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex max-w-32 items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium", className)}
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
        color: `color-mix(in oklch, ${color} 80%, var(--foreground))`,
      }}
      title={name}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}
