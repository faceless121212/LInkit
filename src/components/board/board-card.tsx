"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertCircleIcon, ListTreeIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { PillarDot } from "@/components/posts/pillar-select";
import { isOverdue, postDisplayTitle } from "@/lib/posts/display";
import type { PostWithItems } from "@/lib/types";

export function BoardCard({
  post,
  dragging = false,
  className,
}: {
  post: PostWithItems;
  dragging?: boolean;
  className?: string;
}) {
  const overdue = isOverdue(post);
  const when =
    post.status === "published" && post.published_at
      ? `Published ${format(new Date(post.published_at), "d MMM, HH:mm")}`
      : post.scheduled_at
        ? `${format(new Date(post.scheduled_at), "EEE d MMM, HH:mm")}`
        : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-shadow",
        dragging && "shadow-lg ring-2 ring-ring/40",
        className,
      )}
      data-testid="board-card"
      data-post-id={post.id}
    >
      <div className="flex items-start gap-2">
        {post.pillar && <PillarDot color={post.pillar.color} className="mt-1.5" />}
        <Link href={`/posts/${post.id}`} className="line-clamp-2 flex-1 font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {postDisplayTitle(post)}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {post.kind === "thread" && (
          <Badge variant="secondary" className="gap-1">
            <ListTreeIcon className="size-3" />
            {post.post_items.length}
          </Badge>
        )}
        {when && <span>{when}</span>}
        {overdue && (
          <span className="flex items-center gap-1 font-medium text-destructive" data-testid="overdue-marker">
            <AlertCircleIcon className="size-3" />
            Overdue
          </span>
        )}
      </div>
    </div>
  );
}
