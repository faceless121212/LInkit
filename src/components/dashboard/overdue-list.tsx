"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarClockIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PublishedUrlDialog } from "@/components/posts/dialogs";
import { PillarDot } from "@/components/posts/pillar-select";
import { reschedulePost, updatePostStatus } from "@/lib/posts/actions";
import { postDisplayTitle } from "@/lib/posts/display";
import { tomorrowAtDefaultHour } from "@/lib/tz";
import type { PostWithItems } from "@/lib/types";

export function OverdueList({ posts }: { posts: PostWithItems[] }) {
  const [target, setTarget] = useState<PostWithItems | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rescheduleTomorrow = async (post: PostWithItems) => {
    setBusyId(post.id);
    const iso = tomorrowAtDefaultHour().toISOString();
    const res = await reschedulePost(post.id, iso);
    setBusyId(null);
    if (res.ok) toast.success(`Rescheduled to ${format(new Date(iso), "EEE d MMM, HH:mm")}`);
    else toast.error(res.error);
  };

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing overdue. Nice.</p>;
  }

  return (
    <>
      <ul className="divide-y rounded-xl border">
        {posts.map((post) => (
          <li key={post.id} className="flex flex-wrap items-center gap-3 p-3 text-sm" data-testid="overdue-item">
            {post.pillar && <PillarDot color={post.pillar.color} />}
            <Link href={`/posts/${post.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {postDisplayTitle(post)}
            </Link>
            <span className="text-xs text-destructive tabular-nums">
              was {post.scheduled_at ? format(new Date(post.scheduled_at), "EEE d MMM, HH:mm") : ""}
            </span>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="outline" disabled={busyId === post.id} onClick={() => void rescheduleTomorrow(post)}>
                <CalendarClockIcon data-icon="inline-start" />
                Tomorrow 09:00
              </Button>
              <Button size="xs" disabled={busyId === post.id} onClick={() => setTarget(post)}>
                <CheckIcon data-icon="inline-start" />
                Mark published
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <PublishedUrlDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        pending={busyId !== null}
        onConfirm={async ({ published_url, published_at }) => {
          if (!target) return;
          setBusyId(target.id);
          const res = await updatePostStatus({ id: target.id, status: "published", published_url, published_at });
          setBusyId(null);
          if (res.ok) {
            toast.success("Marked as published");
            setTarget(null);
          } else {
            toast.error(res.error);
          }
        }}
      />
    </>
  );
}
