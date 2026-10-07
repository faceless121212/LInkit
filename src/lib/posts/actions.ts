"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { removeAllPostMedia, removeMedia } from "@/lib/storage";
import { isValidPublishedUrl, itemIssues } from "@/lib/posts/validation";
import type { PostKind, PostStatus } from "@/lib/types";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export type SaveItemInput = {
  id: string;
  position: number;
  body: string;
  media_paths: string[];
};

export type SavePostInput = {
  id: string;
  title: string;
  status: PostStatus;
  kind: PostKind;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  pillar_id: string | null;
  notes: string | null;
  items: SaveItemInput[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/**
 * Validates a status against the post's content. Length/empty issues only
 * block a *transition into* scheduled/published, so autosave of an already
 * scheduled post that is being edited never fails.
 */
function validateStatus(
  next: { status: PostStatus; scheduled_at: string | null; published_url: string | null; published_at: string | null },
  items: { body: string }[],
  kind: PostKind,
  previousStatus: PostStatus | null,
): string | null {
  if (next.status === "scheduled") {
    if (!next.scheduled_at) return "Pick a date and time before scheduling.";
    if (previousStatus !== "scheduled") {
      const issues = itemIssues(items, kind);
      if (issues.length > 0) {
        const first = issues[0];
        return first.reason === "empty"
          ? `Post ${first.index + 1} is empty.`
          : `Post ${first.index + 1} is over 280 characters.`;
      }
    }
  }
  if (next.status === "published") {
    if (!next.published_url || !isValidPublishedUrl(next.published_url)) {
      return "Enter the x.com status URL of the published post.";
    }
    if (!next.published_at) return "Published date is required.";
  }
  return null;
}

export async function savePost(input: SavePostInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await requireUser();
    if (!UUID.test(input.id)) return fail("Invalid post id.");

    const { data: existing } = await supabase
      .from("posts")
      .select("id, status, scheduled_at, reminded_at, post_items(id, media_paths)")
      .eq("id", input.id)
      .maybeSingle();

    const kind: PostKind = input.items.length > 1 ? "thread" : "single";
    const published = input.status === "published";
    const next = {
      status: input.status,
      scheduled_at: input.scheduled_at,
      published_url: published ? input.published_url?.trim() ?? null : null,
      published_at: published ? input.published_at ?? new Date().toISOString() : null,
    };

    const validation = validateStatus(next, input.items, kind, existing?.status ?? null);
    if (validation) return fail(validation);

    const scheduleChanged = (existing?.scheduled_at ?? null) !== (input.scheduled_at ?? null);

    const { error: postErr } = await supabase.from("posts").upsert(
      {
        id: input.id,
        user_id: user.id,
        title: input.title.trim(),
        status: next.status,
        kind,
        scheduled_at: next.scheduled_at,
        published_at: next.published_at,
        published_url: next.published_url,
        pillar_id: input.pillar_id,
        notes: input.notes?.trim() ? input.notes : null,
        reminded_at: scheduleChanged ? null : (existing?.reminded_at ?? null),
      },
      { onConflict: "id" },
    );
    if (postErr) return fail(postErr.message);

    // Items: delete the ones that disappeared (and their media), then upsert the rest.
    const keepIds = new Set(input.items.map((i) => i.id));
    const removedItems = (existing?.post_items ?? []).filter((i) => !keepIds.has(i.id));
    if (removedItems.length > 0) {
      const { error: delErr } = await supabase
        .from("post_items")
        .delete()
        .in(
          "id",
          removedItems.map((i) => i.id),
        );
      if (delErr) return fail(delErr.message);
    }

    const { error: itemsErr } = await supabase.from("post_items").upsert(
      input.items.map((item, index) => ({
        id: item.id,
        post_id: input.id,
        position: index,
        body: item.body,
        media_paths: item.media_paths.slice(0, 4),
      })),
      { onConflict: "id" },
    );
    if (itemsErr) return fail(itemsErr.message);

    // Remove storage objects that are no longer referenced by any item.
    const previousPaths = new Set((existing?.post_items ?? []).flatMap((i) => i.media_paths));
    const currentPaths = new Set(input.items.flatMap((i) => i.media_paths));
    const orphaned = [...previousPaths].filter((p) => !currentPaths.has(p));
    if (orphaned.length > 0) {
      await removeMedia(supabase, orphaned).catch(() => {
        /* best effort; deletePost sweeps the folder anyway */
      });
    }

    revalidatePath("/", "layout");
    return { ok: true, data: { id: input.id } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unknown error");
  }
}

export type StatusChangeInput = {
  id: string;
  status: PostStatus;
  scheduled_at?: string | null;
  published_url?: string | null;
  published_at?: string | null;
};

/** Used by the board, calendar and dashboard. The editor goes through savePost. */
export async function updatePostStatus(input: StatusChangeInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: post, error } = await supabase
      .from("posts")
      .select("id, status, kind, scheduled_at, published_at, published_url, post_items(body)")
      .eq("id", input.id)
      .single();
    if (error || !post) return fail("Post not found.");

    const published = input.status === "published";
    const next = {
      status: input.status,
      scheduled_at: input.scheduled_at === undefined ? post.scheduled_at : input.scheduled_at,
      published_url: published ? (input.published_url ?? post.published_url)?.trim() ?? null : null,
      published_at: published ? input.published_at ?? post.published_at ?? new Date().toISOString() : null,
    };

    const validation = validateStatus(next, post.post_items, post.kind, post.status);
    if (validation) return fail(validation);

    const scheduleChanged = (post.scheduled_at ?? null) !== (next.scheduled_at ?? null);
    const { error: updErr } = await supabase
      .from("posts")
      .update({
        ...next,
        ...(scheduleChanged ? { reminded_at: null } : {}),
      })
      .eq("id", input.id);
    if (updErr) return fail(updErr.message);

    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unknown error");
  }
}

/** Reschedules without touching status (calendar drag). */
export async function reschedulePost(id: string, scheduledAt: string | null): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("posts")
      .update({ scheduled_at: scheduledAt, reminded_at: null })
      .eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unknown error");
  }
}

/** Deletes the post, its items (cascade) and every Storage object under its folder. */
export async function deletePost(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: post } = await supabase.from("posts").select("id").eq("id", id).maybeSingle();
    if (!post) return fail("Post not found.");

    await removeAllPostMedia(supabase, user.id, id);

    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return fail(error.message);

    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unknown error");
  }
}

export type MetricsInput = {
  impressions: number | null;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
  bookmarks: number | null;
};

export async function savePostMetrics(postId: string, metrics: MetricsInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("post_metrics")
      .upsert({ post_id: postId, ...metrics, recorded_at: new Date().toISOString() }, { onConflict: "post_id" });
    if (error) return fail(error.message);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unknown error");
  }
}
