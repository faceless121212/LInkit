"use client";

import { cn } from "cn";
import { BadgeCheckIcon, BookmarkIcon, HeartIcon, MessageCircleIcon, Repeat2Icon, Share2Icon } from "lucide-react";

export type PreviewItem = { key: string; body: string; mediaUrls: string[] };

export function PreviewPanel({
  items,
  displayName = "You",
  handle = "you",
}: {
  items: PreviewItem[];
  displayName?: string;
  handle?: string;
}) {
  const isThread = items.length > 1;
  const initial = (displayName.trim()[0] ?? "Y").toUpperCase();
  return (
    <div className="rounded-2xl border bg-card shadow-sm" data-testid="preview-panel">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <article key={item.key} className="flex gap-3 px-4 pt-3 pb-1" data-testid="preview-item">
            <div className="flex flex-col items-center">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </div>
              {isThread && !last && <div className="my-1 w-0.5 flex-1 rounded bg-border" aria-hidden />}
            </div>
            <div className={cn("min-w-0 flex-1", !last && "pb-2")}>
              <div className="flex items-center gap-1 text-[15px] leading-5">
                <span className="truncate font-semibold">{displayName}</span>
                <BadgeCheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate text-muted-foreground">
                  @{handle} · {isThread ? `${index + 1}/${items.length}` : "now"}
                </span>
              </div>
              <p className="mt-0.5 text-[15px] leading-5 break-words whitespace-pre-wrap">
                {item.body || <span className="text-muted-foreground/70">Start writing to see the preview…</span>}
              </p>
              {item.mediaUrls.length > 0 && (
                <div
                  className={cn(
                    "mt-3 grid gap-0.5 overflow-hidden rounded-2xl border",
                    item.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                  )}
                >
                  {item.mediaUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className={cn("w-full object-cover", item.mediaUrls.length === 1 ? "max-h-80" : "aspect-square")} />
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between pr-6 text-muted-foreground/70">
                <MessageCircleIcon className="size-4" />
                <Repeat2Icon className="size-4" />
                <HeartIcon className="size-4" />
                <BookmarkIcon className="size-4" />
                <Share2Icon className="size-4" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
