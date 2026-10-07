"use client";

import { cn } from "cn";

export type PreviewItem = { key: string; body: string; mediaUrls: string[] };

export function PreviewPanel({ items, displayName = "You", handle = "you" }: { items: PreviewItem[]; displayName?: string; handle?: string }) {
  const isThread = items.length > 1;
  return (
    <div className="flex flex-col gap-0 rounded-xl border bg-card">
      {items.map((item, index) => (
        <article
          key={item.key}
          className={cn("flex gap-3 p-4", index < items.length - 1 && "border-b")}
          data-testid="preview-item"
        >
          <div className="flex flex-col items-center">
            <div className="size-10 shrink-0 rounded-full bg-muted" aria-hidden />
            {isThread && index < items.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-border" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm">
              <span className="font-semibold">{displayName}</span>
              <span className="text-muted-foreground">@{handle} · now</span>
            </div>
            <p className="mt-1 text-[15px] leading-5 whitespace-pre-wrap break-words">
              {isThread && <span className="text-muted-foreground">{index + 1}/ </span>}
              {item.body || <span className="text-muted-foreground">Nothing written yet.</span>}
            </p>
            {item.mediaUrls.length > 0 && (
              <div className={cn("mt-3 grid gap-0.5 overflow-hidden rounded-xl border", item.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {item.mediaUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-video w-full object-cover" />
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
