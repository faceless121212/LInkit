"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertCircleIcon, ListTreeIcon } from "lucide-react";
import { cn } from "cn";
import { PillarChip } from "@/components/posts/status-badge";
import { isOverdue, postDisplayTitle } from "@/lib/posts/display";
import type { PostWithItems } from "@/lib/types";

export function BoardCard({ post, dragging = false, className }: { post: PostWithItems; dragging?: boolean; className?: string }) {
  const overdue = isOverdue(post);
  const when =
    post.status === "published" && post.published_at
      ? format(new Date(post.published_at), "d MMM, HH:mm")
      : post.scheduled_at
        ? format(new Date(post.scheduled_at), "EEE d MMM, HH:mm")
        : null;
  const excerpt = [...post.post_items].sort((a, b) => a.position - b.position)[0]?.body.trim() ?? "";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-[box-shadow,transform] duration-150 hover:shadow-md",
        dragging && "rotate-1 shadow-xl ring-2 ring-primary/40",
        className,
      )}
      data-testid="board-card"
      data-post-id={post.id}
    >
      <Link href={`/posts/${post.id}`} className="line-clamp-2 leading-5 font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
        {postDisplayTitle(post)}
      </Link>
      {post.title.trim() && excerpt && <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">{excerpt}</p>}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {post.pillar && <PillarChip name={post.pillar.name} color={post.pillar.color} />}
        {post.kind === "thread" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium">
            <ListTreeIcon className="size-3" />
            {post.post_items.length}
          </span>
        )}
        {when && <span className="ml-auto tabular-nums">{when}</span>}
        {overdue && (
          <span className="inline-flex items-center gap-1 font-medium text-destructive" data-testid="overdue-marker">
            <AlertCircleIcon className="size-3" />
            Overdue
          </span>
        )}
      </div>
    </div>
  );
}
