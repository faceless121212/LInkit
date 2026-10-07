import type { Tables, PostStatus, PostKind } from "@/lib/database.types";

export type { PostStatus, PostKind };
export type Post = Tables<"posts">;
export type PostItem = Tables<"post_items">;
export type Pillar = Tables<"pillars">;
export type PostMetrics = Tables<"post_metrics">;

export type PostWithItems = Post & {
  post_items: PostItem[];
  pillar: Pillar | null;
  post_metrics: PostMetrics | null;
};

export const POST_STATUSES: PostStatus[] = ["idea", "draft", "scheduled", "published", "cancelled"];

export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  cancelled: "Cancelled",
};

/** Columns in the "board" sense: cancelled is hidden behind a toggle. */
export const BOARD_STATUSES: PostStatus[] = ["idea", "draft", "scheduled", "published"];

export const PUBLISHED_URL_PATTERN = /^https:\/\/(x|twitter)\.com\/.+\/status\/\d+/;

export const MAX_MEDIA_PER_ITEM = 4;
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MEDIA_BUCKET = "post-media";
