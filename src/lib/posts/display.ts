import type { Post, PostWithItems } from "@/lib/types";

/** Title, or the first 60 characters of the first item when there is no title. */
export function postDisplayTitle(post: Pick<PostWithItems, "title" | "post_items">): string {
  if (post.title.trim()) return post.title.trim();
  const first = [...post.post_items].sort((a, b) => a.position - b.position)[0]?.body.trim() ?? "";
  if (!first) return "Untitled";
  return first.length > 60 ? first.slice(0, 60).trimEnd() + "…" : first;
}

/** Scheduled in the past and not yet published. */
export function isOverdue(post: Pick<Post, "status" | "scheduled_at">, now: Date = new Date()): boolean {
  return post.status === "scheduled" && !!post.scheduled_at && new Date(post.scheduled_at).getTime() < now.getTime();
}

/** The instant a post shows on the calendar: published_at when published, else scheduled_at. */
export function calendarInstant(post: Pick<Post, "status" | "scheduled_at" | "published_at">): string | null {
  if (post.status === "published") return post.published_at ?? post.scheduled_at;
  return post.scheduled_at;
}
