"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, PublishedUrlDialog, ScheduleDateDialog } from "@/components/posts/dialogs";
import { copyText, ItemEditor, type EditorItem } from "@/components/posts/item-editor";
import { MetricsForm } from "@/components/posts/metrics-form";
import { PillarSelect } from "@/components/posts/pillar-select";
import { PreviewPanel } from "@/components/posts/preview-panel";
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
  presetScheduledAt,
}: {
  post: PostWithItems | null;
  pillars: Pillar[];
  userId: string;
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

  // Dialog state
  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [unpublishTarget, setUnpublishTarget] = useState<PostStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const issues = useMemo(() => itemIssues(state.items, state.items.length > 1 ? "thread" : "single"), [state.items]);
  const issueByIndex = useMemo(() => new Map(issues.map((i) => [i.index, i.reason])), [issues]);
  const canSchedule = issues.length === 0;

  // Signed URLs for existing media
  useEffect(() => {
    const paths = state.items.flatMap((i) => i.media_paths);
    if (paths.length === 0) return;
    signedMediaUrls(createClient(), paths)
      .then((urls) => setMediaUrls((prev) => ({ ...prev, ...urls })))
      .catch(() => {});
    // Only on mount: later uploads report their URLs directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Saves the current state. Returns true on success. Safe to call concurrently. */
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

  // Autosave on a debounce after the last change.
  useEffect(() => {
    const serialized = JSON.stringify(toInput(postId, state));
    if (serialized === lastSavedRef.current) return;
    // Do not create a row for a brand-new, still-empty post.
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

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

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

  /** Status changes go through dialogs where the spec requires it. */
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

  const applyStatus = async (patch: Partial<EditorState>) => {
    const merged = { ...stateRef.current, ...patch };
    setState(merged);
    const ok = await save(merged);
    if (ok) toast.success(`Marked as ${STATUS_LABELS[merged.status].toLowerCase()}`);
    else toast.error(saveError ?? "Could not save");
    return ok;
  };

  const copyAll = () => copyText(state.items.map((i) => i.body).join("\n\n"), "Thread copied");

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            value={state.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Internal title (not published)"
            className="h-9 max-w-md text-base font-medium"
            aria-label="Title"
          />
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} error={saveError} />
            <Button type="button" variant="outline" size="sm" onClick={() => void save()} disabled={saveState === "saving"}>
              Save
            </Button>
          </div>
        </div>

        {state.status === "scheduled" && !canSchedule && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            This post is scheduled but has an empty or too-long item. Fix it before posting.
          </p>
        )}

        <div className="flex flex-col gap-3">
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
              onChange={(patch) => updateItem(index, patch)}
              onMediaUrls={(urls) => setMediaUrls((prev) => ({ ...prev, ...urls }))}
              onMove={(d) => moveItem(index, d)}
              onRemove={() => removeItem(index)}
              onAddBelow={() => addItemBelow(index)}
              beforeUpload={() => save()}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.items.length > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={() => void copyAll()}>
              <CopyIcon data-icon="inline-start" />
              Copy all
            </Button>
          )}
          {state.status !== "scheduled" && state.status !== "published" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSchedule}
              title={canSchedule ? undefined : "Fix empty or too-long posts first"}
              onClick={() => requestStatus("scheduled")}
            >
              Mark as scheduled
            </Button>
          )}
          {state.status !== "published" && (
            <Button type="button" size="sm" onClick={() => requestStatus("published")}>
              <CheckIcon data-icon="inline-start" />
              Mark as published
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        </div>

        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
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
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-at-input">Scheduled for</Label>
            <Input
              id="scheduled-at-input"
              type="datetime-local"
              value={isoToLocalInput(state.scheduledAt)}
              onChange={(e) => update({ scheduledAt: localInputToIso(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pillar</Label>
            <PillarSelect
              pillars={pillars}
              value={state.pillarId}
              onChange={(pillarId) => update({ pillarId })}
              onPillarCreated={(p) => setPillars((list) => [...list, p].sort((a, b) => a.name.localeCompare(b.name)))}
            />
          </div>
          {state.status === "published" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="published-url-input">Published URL</Label>
              <Input id="published-url-input" value={state.publishedUrl ?? ""} readOnly />
              <span className="text-xs text-muted-foreground">
                Published {state.publishedAt ? new Date(state.publishedAt).toLocaleString() : ""}.{" "}
                <button type="button" className="underline" onClick={() => setPublishOpen(true)}>
                  Edit
                </button>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={state.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Sources, links, reminders to self…"
              className="min-h-20"
            />
          </div>
        </div>

        {state.status === "published" && persistedRef.current && (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">Metrics (manual)</h2>
            <MetricsForm postId={postId} metrics={post?.post_metrics ?? null} />
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</h2>
        <PreviewPanel items={previewItems} />
      </aside>

      <PublishedUrlDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        initialUrl={state.publishedUrl ?? ""}
        initialPublishedAt={state.publishedAt}
        pending={saveState === "saving"}
        onConfirm={async ({ published_url, published_at }) => {
          const ok = await applyStatus({ status: "published", publishedUrl: published_url, publishedAt: published_at });
          if (ok) setPublishOpen(false);
        }}
      />
      <ScheduleDateDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialScheduledAt={state.scheduledAt}
        pending={saveState === "saving"}
        onConfirm={async (iso) => {
          const ok = await applyStatus({ status: "scheduled", scheduledAt: iso });
          if (ok) setScheduleOpen(false);
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

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  const base = "flex items-center gap-1 text-xs";
  switch (state) {
    case "saving":
      return (
        <span className={`${base} text-muted-foreground`} data-testid="save-indicator">
          <Loader2Icon className="size-3 animate-spin" /> Saving…
        </span>
      );
    case "saved":
      return (
        <span className={`${base} text-emerald-600`} data-testid="save-indicator">
          <CheckIcon className="size-3" /> Saved
        </span>
      );
    case "dirty":
      return (
        <span className={`${base} text-muted-foreground`} data-testid="save-indicator">
          Unsaved changes
        </span>
      );
    case "error":
      return (
        <span className={`${base} text-destructive`} data-testid="save-indicator" title={error ?? undefined}>
          {error ?? "Could not save"}
        </span>
      );
    default:
      return <span className={base} data-testid="save-indicator" />;
  }
}
