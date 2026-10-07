"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { cn } from "cn";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BoardCard } from "@/components/board/board-card";
import { ConfirmDialog, PublishedUrlDialog, ScheduleDateDialog } from "@/components/posts/dialogs";
import { updatePostStatus, type StatusChangeInput } from "@/lib/posts/actions";
import { BOARD_STATUSES, STATUS_LABELS, type PostStatus, type PostWithItems } from "@/lib/types";

type PendingMove = { post: PostWithItems; to: PostStatus };

export function BoardView({ posts: initialPosts }: { posts: PostWithItems[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [showCancelled, setShowCancelled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [dialog, setDialog] = useState<"schedule" | "publish" | "unpublish" | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep local state in sync when the server re-renders with fresh data.
  const [seen, setSeen] = useState(initialPosts);
  if (seen !== initialPosts) {
    setSeen(initialPosts);
    setPosts(initialPosts);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo<PostStatus[]>(
    () => (showCancelled ? [...BOARD_STATUSES, "cancelled"] : BOARD_STATUSES),
    [showCancelled],
  );
  const byStatus = useMemo(() => {
    const map = new Map<PostStatus, PostWithItems[]>();
    for (const s of columns) map.set(s, []);
    for (const p of posts) map.get(p.status)?.push(p);
    for (const [, list] of map) {
      list.sort((a, b) => {
        const ad = a.status === "published" ? a.published_at : a.scheduled_at;
        const bd = b.status === "published" ? b.published_at : b.scheduled_at;
        if (ad && bd) return a.status === "published" ? bd.localeCompare(ad) : ad.localeCompare(bd);
        if (ad) return -1;
        if (bd) return 1;
        return b.updated_at.localeCompare(a.updated_at);
      });
    }
    return map;
  }, [posts, columns]);

  const activePost = activeId ? posts.find((p) => p.id === activeId) ?? null : null;

  const commit = async (input: StatusChangeInput, optimistic: Partial<PostWithItems>) => {
    const previous = posts;
    setPosts((list) => list.map((p) => (p.id === input.id ? { ...p, ...optimistic } : p)));
    setBusy(true);
    const res = await updatePostStatus(input);
    setBusy(false);
    if (!res.ok) {
      setPosts(previous);
      toast.error(res.error);
      return false;
    }
    return true;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const post = posts.find((p) => p.id === active.id);
    const to = over.id as PostStatus;
    if (!post || post.status === to) return;

    if (post.status === "published") {
      setPending({ post, to });
      setDialog("unpublish");
      return;
    }
    if (to === "published") {
      setPending({ post, to });
      setDialog("publish");
      return;
    }
    if (to === "scheduled" && !post.scheduled_at) {
      setPending({ post, to });
      setDialog("schedule");
      return;
    }
    await commit({ id: post.id, status: to }, { status: to });
  };

  const closeDialog = () => {
    setDialog(null);
    setPending(null);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Board</h1>
        <div className="flex items-center gap-2">
          <Switch id="show-cancelled" checked={showCancelled} onCheckedChange={(c) => setShowCancelled(c)} />
          <Label htmlFor="show-cancelled" className="text-sm">
            Show cancelled
          </Label>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={(e) => void onDragEnd(e)}>
        <div className="grid flex-1 gap-3 overflow-x-auto md:grid-cols-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }}>
          {columns.map((status) => (
            <Column key={status} status={status} posts={byStatus.get(status) ?? []} />
          ))}
        </div>
        <DragOverlay>{activePost ? <BoardCard post={activePost} dragging /> : null}</DragOverlay>
      </DndContext>

      <ScheduleDateDialog
        open={dialog === "schedule"}
        onOpenChange={(o) => !o && closeDialog()}
        pending={busy}
        onConfirm={async (iso) => {
          if (!pending) return;
          const ok = await commit(
            { id: pending.post.id, status: "scheduled", scheduled_at: iso },
            { status: "scheduled", scheduled_at: iso },
          );
          if (ok) closeDialog();
        }}
      />
      <PublishedUrlDialog
        open={dialog === "publish"}
        onOpenChange={(o) => !o && closeDialog()}
        pending={busy}
        onConfirm={async ({ published_url, published_at }) => {
          if (!pending) return;
          const ok = await commit(
            { id: pending.post.id, status: "published", published_url, published_at },
            { status: "published", published_url, published_at },
          );
          if (ok) closeDialog();
        }}
      />
      <ConfirmDialog
        open={dialog === "unpublish"}
        onOpenChange={(o) => !o && closeDialog()}
        title="Remove published status?"
        description="This clears the published URL and date. The post text is kept."
        confirmLabel="Yes, change status"
        destructive
        pending={busy}
        onConfirm={async () => {
          if (!pending) return;
          const { post, to } = pending;
          if (to === "scheduled" && !post.scheduled_at) {
            setDialog("schedule");
            return;
          }
          const ok = await commit(
            { id: post.id, status: to },
            { status: to, published_url: null, published_at: null },
          );
          if (ok) closeDialog();
        }}
      />
    </div>
  );
}

const COLUMN_DOT: Record<PostStatus, string> = {
  idea: "bg-muted-foreground/50",
  draft: "bg-amber-400",
  scheduled: "bg-sky-400",
  published: "bg-emerald-400",
  cancelled: "bg-muted-foreground/30",
};

function Column({ status, posts }: { status: PostStatus; posts: PostWithItems[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-64 flex-col gap-2 rounded-2xl border border-transparent bg-muted/40 p-2 transition-colors duration-150 dark:bg-muted/25",
        isOver && "border-primary/40 bg-primary/5",
      )}
      data-testid={`column-${status}`}
      aria-label={`${STATUS_LABELS[status]} column`}
    >
      <header className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium">
        <span className={cn("size-2 rounded-full", COLUMN_DOT[status])} aria-hidden />
        <span>{STATUS_LABELS[status]}</span>
        <span className="ml-auto rounded-md bg-background/60 px-1.5 text-[11px] text-muted-foreground tabular-nums">{posts.length}</span>
      </header>
      {posts.map((post) => (
        <DraggableCard key={post.id} post={post} />
      ))}
      {posts.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
    </section>
  );
}

function DraggableCard({ post }: { post: PostWithItems }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <BoardCard post={post} />
    </div>
  );
}
