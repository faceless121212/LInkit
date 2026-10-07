import { createClient } from "@/lib/supabase/server";
import { POST_WITH_RELATIONS } from "@/lib/posts/queries";
import { POST_STATUSES, type PostStatus, type PostWithItems } from "@/lib/types";

export const SORT_KEYS = ["scheduled_at", "status", "pillar", "updated_at"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type ListParams = {
  q?: string;
  pillar?: string;
  status?: string;
  sort?: string;
  dir?: string;
};

export type NormalizedListParams = {
  q: string;
  pillar: string | null;
  status: PostStatus | null;
  sort: SortKey;
  dir: "asc" | "desc";
};

export function normalizeListParams(p: ListParams): NormalizedListParams {
  const sort = (SORT_KEYS as readonly string[]).includes(p.sort ?? "") ? (p.sort as SortKey) : "updated_at";
  return {
    q: (p.q ?? "").trim(),
    pillar: p.pillar && p.pillar !== "all" ? p.pillar : null,
    status: (POST_STATUSES as string[]).includes(p.status ?? "") ? (p.status as PostStatus) : null,
    sort,
    dir: p.dir === "asc" ? "asc" : p.dir === "desc" ? "desc" : sort === "updated_at" ? "desc" : "asc",
  };
}

const STATUS_ORDER: Record<PostStatus, number> = { idea: 0, draft: 1, scheduled: 2, published: 3, cancelled: 4 };

export function sortPosts(posts: PostWithItems[], sort: SortKey, dir: "asc" | "desc"): PostWithItems[] {
  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a: PostWithItems, b: PostWithItems): number => {
    switch (sort) {
      case "scheduled_at": {
        // Nulls last regardless of direction
        if (!a.scheduled_at && !b.scheduled_at) return 0;
        if (!a.scheduled_at) return 1;
        if (!b.scheduled_at) return -1;
        return sign * a.scheduled_at.localeCompare(b.scheduled_at);
      }
      case "status":
        return sign * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      case "pillar": {
        const an = a.pillar?.name ?? "";
        const bn = b.pillar?.name ?? "";
        if (!an && !bn) return 0;
        if (!an) return 1;
        if (!bn) return -1;
        return sign * an.localeCompare(bn);
      }
      default:
        return sign * a.updated_at.localeCompare(b.updated_at);
    }
  };
  return [...posts].sort((a, b) => cmp(a, b) || b.updated_at.localeCompare(a.updated_at));
}

/**
 * Lists posts for the list view and CSV export. Search uses the
 * `search_posts` SQL function (ilike over title, notes and item bodies).
 */
export async function queryPosts(raw: ListParams): Promise<{ posts: PostWithItems[]; params: NormalizedListParams }> {
  const params = normalizeListParams(raw);
  const supabase = await createClient();

  let ids: string[] | null = null;
  if (params.q) {
    const { data, error } = await supabase.rpc("search_posts", { q: params.q });
    if (error) throw new Error(error.message);
    ids = (data ?? []).map((p) => p.id);
    if (ids.length === 0) return { posts: [], params };
  }

  let query = supabase
    .from("posts")
    .select(POST_WITH_RELATIONS)
    .order("position", { referencedTable: "post_items", ascending: true });
  if (ids) query = query.in("id", ids);
  if (params.pillar) query = query.eq("pillar_id", params.pillar);
  if (params.status) query = query.eq("status", params.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const posts = (data as unknown as PostWithItems[]) ?? [];
  return { posts: sortPosts(posts, params.sort, params.dir), params };
}

export const CSV_COLUMNS = [
  "title",
  "status",
  "kind",
  "scheduled_at",
  "published_at",
  "published_url",
  "pillar",
  "impressions",
  "likes",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Prevent spreadsheet formula injection and escape quotes/newlines.
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function postsToCsv(posts: PostWithItems[]): string {
  const rows = posts.map((p) =>
    [
      p.title,
      p.status,
      p.kind,
      p.scheduled_at,
      p.published_at,
      p.published_url,
      p.pillar?.name ?? "",
      p.post_metrics?.impressions ?? "",
      p.post_metrics?.likes ?? "",
    ].map(csvCell),
  );
  return [CSV_COLUMNS.join(","), ...rows.map((r) => r.join(","))].join("\r\n") + "\r\n";
}
