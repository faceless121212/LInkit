"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, PublishedUrlDialog, ScheduleDateDialog } from "@/components/posts/dialogs";
import { copyText, ItemEditor, type EditorItem } from "@/components/posts/item-editor";
import { MetricsForm } from "@/components/posts/metrics-form";
import { PillarSelect } from "@/components/posts/pillar-select";
import { PreviewPanel } from "@/components/posts/preview-panel";
import { StatusBadge } from "@/components/posts/status-badge";
import { deletePost, savePost, type SavePostInput } from "@/lib/posts/actions";
import { itemIssues } from "@/lib/posts/validation";
import { createClient } from "@/lib/supabase/client";
import { signedMediaUrls } from "@/lib/storage";
import { isoToLocalInput, localInputToIso } from "@/lib/tz";
import { POST_STATUSES, STATUS_LABELS, type Pillar, type PostStatus, type PostWithItems } from "@/lib/types";

type EditorState = {
  title: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  pillarId: string | null;
  notes: string;
  items: EditorItem[];
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1500;

function newId() {
  return crypto.randomUUID();
}

function initialState(post: PostWithItems | null, presetScheduledAt?: string | null): EditorState {
  if (!post) {
    return {
      title: "",
      status: presetScheduledAt ? "draft" : "idea",
      scheduledAt: presetScheduledAt ?? null,
      publishedAt: null,
      publishedUrl: null,
      pillarId: null,
      notes: "",
      items: [{ id: newId(), body: "", media_paths: [] }],
    };
  }
  const items = [...post.post_items]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ id: i.id, body: i.body, media_paths: i.media_paths }));
  return {
    title: post.title,
    status: post.status,
    scheduledAt: post.scheduled_at,
    publishedAt: post.published_at,
    publishedUrl: post.published_url,
    pillarId: post.pillar_id,
    notes: post.notes ?? "",
    items: items.length > 0 ? items : [{ id: newId(), body: "", media_paths: [] }],
  };
}

function toInput(id: string, s: EditorState): SavePostInput {
  return {
    id,
    title: s.title,
    status: s.status,
    kind: s.items.length > 1 ? "thread" : "single",
    scheduled_at: s.scheduledAt,
    published_at: s.publishedAt,
    published_url: s.publishedUrl,
    pillar_id: s.pillarId,
    notes: s.notes,
    items: s.items.map((i, position) => ({ id: i.id, position, body: i.body, media_paths: i.media_paths })),
  };
}

export function PostEditor({
  post,
  pillars: initialPillars,
  userId,
  authorEmail,
  presetScheduledAt,
}: {
  post: PostWithItems | null;
  pillars: Pillar[];
  userId: string;
  authorEmail: string;
  presetScheduledAt?: string | null;
}) {
  const router = useRouter();
  const [postId] = useState(() => post?.id ?? newId());
  const [state, setState] = useState<EditorState>(() => initialState(post, presetScheduledAt));
  const [pillars, setPillars] = useState(initialPillars);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistedRef = useRef(!!post);
  const lastSavedRef = useRef(JSON.stringify(toInput(postId, state)));
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState<PostStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handle = authorEmail.split("@")[0] || "you";
  const displayName = handle.charAt(0).toUpperCase() + handle.slice(1);

  const issues = useMemo(() => itemIssues(state.items, state.items.length > 1 ? "thread" : "single"), [state.items]);
  const issueByIndex = useMemo(() => new Map(issues.map((i) => [i.index, i.reason])), [issues]);
  const canSchedule = issues.length === 0;

  useEffect(() => {
    const paths = state.items.flatMap((i) => i.media_paths);
    if (paths.length === 0) return;
    signedMediaUrls(createClient(), paths)
      .then((urls) => setMediaUrls((prev) => ({ ...prev, ...urls })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (override?: Partial<EditorState>): Promise<boolean> => {
      if (savingRef.current) {
        queuedRef.current = true;
        return true;
      }
      const snapshotState = { ...stateRef.current, ...override };
      const input = toInput(postId, snapshotState);
      const serialized = JSON.stringify(input);
      if (serialized === lastSavedRef.current && persistedRef.current) {
        setSaveState((s) => (s === "dirty" ? "saved" : s));
        return true;
      }
      savingRef.current = true;
      setSaveState("saving");
      setSaveError(null);
      const res = await savePost(input);
      savingRef.current = false;
      if (!res.ok) {
        setSaveState("error");
        setSaveError(res.error);
        return false;
      }
      lastSavedRef.current = serialized;
      if (!persistedRef.current) {
        persistedRef.current = true;
        window.history.replaceState(null, "", `/posts/${postId}`);
      }
      setSaveState("saved");
      if (queuedRef.current) {
        queuedRef.current = false;
        void save();
      }
      return true;
    },
    [postId],
  );

  useEffect(() => {
    const serialized = JSON.stringify(toInput(postId, state));
    if (serialized === lastSavedRef.current) return;
    const isEmptyNew =
      !persistedRef.current &&
      state.title.trim() === "" &&
      state.notes.trim() === "" &&
      state.items.every((i) => i.body.trim() === "" && i.media_paths.length === 0);
    if (isEmptyNew) return;
    setSaveState("dirty");
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [state, postId, save]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  // Keyboard: Cmd/Ctrl+S saves, Cmd/Ctrl+Enter copies all.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const update = (patch: Partial<EditorState>) => setState((s) => ({ ...s, ...patch }));
  const updateItem = (index: number, patch: Partial<EditorItem>) =>
    setState((s) => ({ ...s, items: s.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  const moveItem = (index: number, direction: -1 | 1) =>
    setState((s) => {
      const target = index + direction;
      if (target < 0 || target >= s.items.length) return s;
      const items = [...s.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...s, items };
    });
  const removeItem = (index: number) =>
    setState((s) => (s.items.length <= 1 ? s : { ...s, items: s.items.filter((_, i) => i !== index) }));
  const addItemBelow = (index: number) =>
    setState((s) => {
      const items = [...s.items];
      items.splice(index + 1, 0, { id: newId(), body: "", media_paths: [] });
      return { ...s, items };
    });

  const applyStatus = async (patch: Partial<EditorState>) => {
    const merged = { ...stateRef.current, ...patch };
    setState(merged);
    const ok = await save(merged);
    if (ok) toast.success(`Marked as ${STATUS_LABELS[merged.status].toLowerCase()}`);
    return ok;
  };

  const requestStatus = (next: PostStatus) => {
    if (next === state.status) return;
    if (state.status === "published") {
      setUnpublishTarget(next);
      return;
    }
    if (next === "published") {
      setPublishOpen(true);
      return;
    }
    if (next === "scheduled") {
      if (!canSchedule) {
        toast.error("Fix empty or too-long posts before scheduling.");
        return;
      }
      if (!state.scheduledAt) {
        setScheduleOpen(true);
        return;
      }
    }
    void applyStatus({ status: next });
  };

  const copyAll = () => copyText(state.items.map((i) => i.body).join("\n\n"), state.items.length > 1 ? "Thread copied" : "Copied");

  const handleDelete = async () => {
    setDeleting(true);
    if (!persistedRef.current) {
      router.push("/board");
      return;
    }
    const res = await deletePost(postId);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Post deleted");
    router.push("/board");
  };

  const previewItems = state.items.map((i) => ({
    key: i.id,
    body: i.body,
    mediaUrls: i.media_paths.map((p) => mediaUrls[p]).filter(Boolean),
  }));

  const isPublished = state.status === "published";
  const isScheduled = state.status === "scheduled";

  return (
    <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-6">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/85 px-3 py-2 backdrop-blur md:px-5">
        <Button variant="ghost" size="icon-sm" render={<Link href="/board" />} nativeButton={false} aria-label="Back to board">
          <ChevronLeftIcon />
        </Button>
        <Input
          value={state.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Untitled post"
          className="h-8 max-w-sm flex-1 border-transparent bg-transparent px-2 text-[15px] font-medium shadow-none hover:border-input focus-visible:border-input dark:bg-transparent"
          aria-label="Title"
        />
        <StatusBadge status={state.status} className="hidden sm:inline-flex" />
        <div className="ml-auto flex items-center gap-1.5">
          <SaveIndicator state={saveState} error={saveError} />
          {!isPublished && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isScheduled ? setScheduleOpen(true) : requestStatus("scheduled"))}
              disabled={!canSchedule && !isScheduled}
              title={!canSchedule && !isScheduled ? "Fix empty or too-long posts first" : undefined}
              data-testid="schedule-button"
            >
              <CalendarClockIcon data-icon="inline-start" />
              {isScheduled && state.scheduledAt
                ? format(new Date(state.scheduledAt), "EEE d MMM, HH:mm")
                : state.scheduledAt
                  ? `Schedule · ${format(new Date(state.scheduledAt), "d MMM, HH:mm")}`
                  : "Schedule"}
            </Button>
          )}
          {!isPublished && (
            <Button size="sm" onClick={() => requestStatus("published")} data-testid="publish-button">
              <CheckIcon data-icon="inline-start" />
              Mark published
            </Button>
          )}
          {isPublished && state.publishedUrl && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={state.publishedUrl} target="_blank" rel="noreferrer" />}
              nativeButton={false}
              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2Icon data-icon="inline-start" />
              Published
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void copyAll()}>
                <CopyIcon />
                {state.items.length > 1 ? "Copy all" : "Copy text"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void save()}>
                <CheckIcon />
                Save now
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-10">
        {/* Editor column */}
        <div className="mx-auto w-full max-w-2xl">
          {isScheduled && !canSchedule && (
            <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              This post is scheduled but has an empty or too-long item. Fix it before posting.
            </p>
          )}
          <div className="flex flex-col">
            {state.items.map((item, index) => (
              <ItemEditor
                key={item.id}
                item={item}
                index={index}
                total={state.items.length}
                userId={userId}
                postId={postId}
                mediaUrls={mediaUrls}
                issue={issueByIndex.get(index)}
                avatarInitial={displayName.charAt(0)}
                onChange={(patch) => updateItem(index, patch)}
                onMediaUrls={(urls) => setMediaUrls((prev) => ({ ...prev, ...urls }))}
                onMove={(d) => moveItem(index, d)}
                onRemove={() => removeItem(index)}
                onAddBelow={() => addItemBelow(index)}
                beforeUpload={() => save()}
              />
            ))}
          </div>
          {state.items.length > 1 && (
            <div className="mt-6 flex items-center gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyAll()}>
                <CopyIcon data-icon="inline-start" />
                Copy all {state.items.length} posts
              </Button>
              <span className="text-xs text-muted-foreground">Joined with blank lines, ready to paste into X.</span>
            </div>
          )}
        </div>

        {/* Side column */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-16 lg:self-start">
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Preview</h2>
            <PreviewPanel items={previewItems} displayName={displayName} handle={handle} />
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Details</h2>
            <div className="flex flex-col gap-3.5">
              <Field label="Status">
                <Select
                  value={state.status}
                  onValueChange={(v) => requestStatus(v as PostStatus)}
                  items={POST_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                >
                  <SelectTrigger className="w-full" aria-label="Status" data-testid="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} disabled={s === "scheduled" && !canSchedule && state.status !== "scheduled"}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Scheduled for" htmlFor="scheduled-at-input">
                <Input
                  id="scheduled-at-input"
                  type="datetime-local"
                  value={isoToLocalInput(state.scheduledAt)}
                  onChange={(e) => update({ scheduledAt: localInputToIso(e.target.value) })}
                />
              </Field>
              <Field label="Pillar">
                <PillarSelect
                  pillars={pillars}
                  value={state.pillarId}
                  onChange={(pillarId) => update({ pillarId })}
                  onPillarCreated={(p) => setPillars((list) => [...list, p].sort((a, b) => a.name.localeCompare(b.name)))}
                />
              </Field>
              {isPublished && (
                <Field label="Published URL" htmlFor="published-url-input">
                  <Input id="published-url-input" value={state.publishedUrl ?? ""} readOnly className="text-xs" />
                  <span className="text-xs text-muted-foreground">
                    {state.publishedAt ? format(new Date(state.publishedAt), "EEE d MMM yyyy, HH:mm") : ""} ·{" "}
                    <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setPublishOpen(true)}>
                      Edit
                    </button>
                  </span>
                </Field>
              )}
              <Field label="Notes" htmlFor="notes">
                <Textarea
                  id="notes"
                  value={state.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="Sources, links, reminders to self…"
                  className="min-h-20 text-sm"
                />
              </Field>
            </div>
          </section>

          {isPublished && persistedRef.current && (
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Metrics</h2>
              <MetricsForm postId={postId} metrics={post?.post_metrics ?? null} />
            </section>
          )}
        </aside>
      </div>

      <PublishedUrlDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        initialUrl={state.publishedUrl ?? ""}
        initialPublishedAt={state.publishedAt}
        pending={saveState === "saving"}
        onConfirm={async ({ published_url, published_at }) => {
          const ok = await applyStatus({ status: "published", publishedUrl: published_url, publishedAt: published_at });
          if (ok) setPublishOpen(false);
          else toast.error(saveError ?? "Could not save");
        }}
      />
      <ScheduleDateDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialScheduledAt={state.scheduledAt}
        pending={saveState === "saving"}
        title={isScheduled ? "Reschedule post" : "Schedule post"}
        onConfirm={async (iso) => {
          const ok = await applyStatus({ status: "scheduled", scheduledAt: iso });
          if (ok) setScheduleOpen(false);
          else toast.error(saveError ?? "Could not save");
        }}
      />
      <ConfirmDialog
        open={unpublishTarget !== null}
        onOpenChange={(o) => !o && setUnpublishTarget(null)}
        title="Remove published status?"
        description="This clears the published URL and date. The post text is kept."
        confirmLabel="Yes, change status"
        destructive
        onConfirm={async () => {
          const target = unpublishTarget ?? "draft";
          setUnpublishTarget(null);
          await applyStatus({ status: target, publishedUrl: null, publishedAt: null });
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this post?"
        description="The post, its items and uploaded images are deleted permanently."
        confirmLabel="Delete"
        destructive
        pending={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  const base = "mr-1 hidden items-center gap-1 text-xs sm:flex";
  switch (state) {
    case "saving":
      return (
        <span className={cn(base, "text-muted-foreground")} data-testid="save-indicator">
          <Loader2Icon className="size-3 animate-spin" /> Saving…
        </span>
      );
    case "saved":
      return (
        <span className={cn(base, "text-muted-foreground")} data-testid="save-indicator">
          <CheckIcon className="size-3 text-emerald-500" /> Saved
        </span>
      );
    case "dirty":
      return (
        <span className={cn(base, "text-muted-foreground")} data-testid="save-indicator">
          Unsaved
        </span>
      );
    case "error":
      return (
        <span className={cn(base, "text-destructive")} data-testid="save-indicator" title={error ?? undefined}>
          {error ?? "Could not save"}
        </span>
      );
    default:
      return <span className={base} data-testid="save-indicator" />;
  }
}
