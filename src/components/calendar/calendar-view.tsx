"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, ListTreeIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PillarDot } from "@/components/posts/pillar-select";
import {
  bucketByDay,
  formatDayKey,
  monthGrid,
  parseDayKey,
  shiftAnchor,
  weekDays,
  type CalendarView as View,
} from "@/lib/calendar";
import { DEFAULT_POST_HOUR } from "@/lib/config/reminders";
import { reschedulePost } from "@/lib/posts/actions";
import { calendarInstant, isOverdue, postDisplayTitle } from "@/lib/posts/display";
import { moveToDay } from "@/lib/tz";
import { POST_STATUSES, STATUS_LABELS, type Pillar, type PostStatus, type PostWithItems } from "@/lib/types";

export function CalendarView({
  posts: initialPosts,
  pillars,
  view,
  anchor,
  pillarFilter,
  statusFilter,
}: {
  posts: PostWithItems[];
  pillars: Pillar[];
  view: View;
  anchor: string;
  pillarFilter: string | null;
  statusFilter: PostStatus | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tz, setTz] = useState<string | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [seen, setSeen] = useState(initialPosts);
  if (seen !== initialPosts) {
    setSeen(initialPosts);
    setPosts(initialPosts);
  }

  // Browser timezone is only known on the client; render the grid after mount
  // so server and client markup agree.
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (!pillarFilter || p.pillar_id === pillarFilter) &&
          (!statusFilter || p.status === statusFilter) &&
          (statusFilter ? true : p.status !== "cancelled"),
      ),
    [posts, pillarFilter, statusFilter],
  );

  const buckets = useMemo(() => (tz ? bucketByDay(filtered, tz) : new Map<string, PostWithItems[]>()), [filtered, tz]);
  const todayKey = tz ? formatDayKey(new Date()) : null;
  const days = view === "month" ? monthGrid(anchor) : [weekDays(anchor)];
  const anchorDate = parseDayKey(anchor);
  const monthOfAnchor = format(anchorDate, "yyyy-MM");

  const createOn = (dayKey: string) => {
    const d = parseDayKey(dayKey);
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DEFAULT_POST_HOUR, 0, 0);
    router.push(`/posts/new?scheduled_at=${encodeURIComponent(at.toISOString())}`);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !tz) return;
    const post = posts.find((p) => p.id === active.id);
    const dayKey = String(over.id);
    if (!post || post.status === "published") return;
    const current = calendarInstant(post);
    if (!current) return;
    const nextIso = moveToDay(current, dayKey, tz).toISOString();
    if (nextIso === current) return;

    const previous = posts;
    setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, scheduled_at: nextIso } : p)));
    const res = await reschedulePost(post.id, nextIso);
    if (!res.ok) {
      setPosts(previous);
      toast.error(res.error);
    }
  };

  const activePost = activeId ? posts.find((p) => p.id === activeId) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Calendar</h1>
          <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => setParams({ date: shiftAnchor(anchor, view, -1) })}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => setParams({ date: shiftAnchor(anchor, view, 1) })}>
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setParams({ date: formatDayKey(new Date()) })}>
            Today
          </Button>
          <span className="ml-1 text-sm font-medium" data-testid="calendar-range">
            {view === "month"
              ? format(anchorDate, "MMMM yyyy")
              : `${format(parseDayKey(weekDays(anchor)[0]), "d MMM")} – ${format(parseDayKey(weekDays(anchor)[6]), "d MMM yyyy")}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setParams({ view: String(v) })}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={pillarFilter ?? "all"}
            onValueChange={(v) => setParams({ pillar: v == null ? null : String(v) })}
            items={[{ value: "all", label: "All pillars" }, ...pillars.map((p) => ({ value: p.id, label: p.name }))]}
          >
            <SelectTrigger size="sm" aria-label="Filter by pillar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pillars</SelectItem>
              {pillars.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <PillarDot color={p.color} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter ?? "all"}
            onValueChange={(v) => setParams({ status: v == null ? null : String(v) })}
            items={[{ value: "all", label: "All statuses" }, ...POST_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          >
            <SelectTrigger size="sm" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {!tz ? (
        <div className="h-96 animate-pulse rounded-xl bg-muted/50" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={(e) => void onDragEnd(e)}>
          <div className={cn("grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border", view === "week" && "min-h-[60vh]")}>
            {days.flat().map((dayKey) => (
              <DayCell
                key={dayKey}
                dayKey={dayKey}
                posts={buckets.get(dayKey) ?? []}
                isToday={dayKey === todayKey}
                muted={view === "month" && !dayKey.startsWith(monthOfAnchor)}
                tall={view === "week"}
                onCreate={() => createOn(dayKey)}
                tz={tz}
              />
            ))}
          </div>
          <DragOverlay>{activePost ? <EventChip post={activePost} tz={tz} dragging /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function DayCell({
  dayKey,
  posts,
  isToday,
  muted,
  tall,
  onCreate,
  tz,
}: {
  dayKey: string;
  posts: PostWithItems[];
  isToday: boolean;
  muted: boolean;
  tall: boolean;
  onCreate: () => void;
  tz: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  const dayNumber = Number(dayKey.slice(-2));
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-1 bg-background p-1.5",
        tall ? "min-h-[60vh]" : "min-h-24",
        muted && "bg-muted/30 text-muted-foreground",
        isOver && "bg-accent",
      )}
      data-testid={`day-${dayKey}`}
      data-day={dayKey}
    >
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "flex size-6 items-center justify-center self-start rounded-full text-xs hover:bg-muted",
          isToday && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
        )}
        aria-label={`Create post on ${dayKey}`}
        title="New post at 09:00"
      >
        {dayNumber}
      </button>
      <div className="flex flex-col gap-1">
        {posts.map((p) => (
          <DraggableChip key={p.id} post={p} tz={tz} />
        ))}
      </div>
      {posts.length === 0 && <button type="button" onClick={onCreate} className="flex-1" aria-hidden tabIndex={-1} />}
    </div>
  );
}

function DraggableChip({ post, tz }: { post: PostWithItems; tz: string }) {
  const disabled = post.status === "published";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn(!disabled && "cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <EventChip post={post} tz={tz} />
    </div>
  );
}

function EventChip({ post, tz, dragging = false }: { post: PostWithItems; tz: string; dragging?: boolean }) {
  const instant = calendarInstant(post);
  const time = instant ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(instant)) : "";
  const overdue = isOverdue(post);
  const published = post.status === "published";
  return (
    <Link
      href={`/posts/${post.id}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs leading-4 hover:bg-muted",
        published && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
        overdue && "border-destructive/50 bg-destructive/10",
        post.status === "idea" || post.status === "draft" ? "border-dashed" : "",
        dragging && "bg-background shadow-lg",
      )}
      data-testid="calendar-event"
      data-post-id={post.id}
      data-status={post.status}
      title={postDisplayTitle(post)}
    >
      {post.pillar && <PillarDot color={post.pillar.color} />}
      <span className="tabular-nums text-muted-foreground">{time}</span>
      <span className="truncate">{postDisplayTitle(post)}</span>
      {post.kind === "thread" && <ListTreeIcon className="ml-auto size-3 shrink-0 text-muted-foreground" />}
      {published && <CheckCircle2Icon className="ml-auto size-3 shrink-0 text-emerald-600" data-testid="published-badge" />}
    </Link>
  );
}
