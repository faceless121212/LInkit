import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, ListTreeIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillarDot } from "@/components/posts/pillar-select";
import { isOverdue, postDisplayTitle } from "@/lib/posts/display";
import type { NormalizedListParams, SortKey } from "@/lib/posts/list";
import { STATUS_LABELS, type PostWithItems } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  draft: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  scheduled: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  published: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: PostWithItems["status"] }) {
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium", STATUS_BADGE[status])} data-testid="status-badge">
      {STATUS_LABELS[status]}
    </span>
  );
}

function SortLink({
  label,
  sortKey,
  params,
  searchParams,
}: {
  label: string;
  sortKey: SortKey;
  params: NormalizedListParams;
  searchParams: URLSearchParams;
}) {
  const active = params.sort === sortKey;
  const nextDir = active && params.dir === "asc" ? "desc" : "asc";
  const next = new URLSearchParams(searchParams);
  next.set("sort", sortKey);
  next.set("dir", nextDir);
  return (
    <Link href={`/posts?${next.toString()}`} className="inline-flex items-center gap-1 hover:underline">
      {label}
      {active && (params.dir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
    </Link>
  );
}

export function PostsTable({
  posts,
  params,
  searchParams,
}: {
  posts: PostWithItems[];
  params: NormalizedListParams;
  searchParams: URLSearchParams;
}) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>
              <SortLink label="Status" sortKey="status" params={params} searchParams={searchParams} />
            </TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>
              <SortLink label="Scheduled" sortKey="scheduled_at" params={params} searchParams={searchParams} />
            </TableHead>
            <TableHead>Published</TableHead>
            <TableHead>
              <SortLink label="Pillar" sortKey="pillar" params={params} searchParams={searchParams} />
            </TableHead>
            <TableHead className="text-right">Impr.</TableHead>
            <TableHead className="text-right">Likes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No posts match.
              </TableCell>
            </TableRow>
          )}
          {posts.map((p) => (
            <TableRow key={p.id} data-testid="post-row">
              <TableCell className="max-w-xs">
                <Link href={`/posts/${p.id}`} className="line-clamp-1 font-medium hover:underline">
                  {postDisplayTitle(p)}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  {isOverdue(p) && <span className="text-xs font-medium text-destructive">Overdue</span>}
                </div>
              </TableCell>
              <TableCell>
                {p.kind === "thread" ? (
                  <Badge variant="secondary" className="gap-1">
                    <ListTreeIcon className="size-3" />
                    {p.post_items.length}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Single</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {p.scheduled_at ? format(new Date(p.scheduled_at), "d MMM yyyy, HH:mm") : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {p.published_at ? (
                  <span className="inline-flex items-center gap-1">
                    {format(new Date(p.published_at), "d MMM yyyy, HH:mm")}
                    {p.published_url && (
                      <a href={p.published_url} target="_blank" rel="noreferrer" aria-label="Open on X" className="text-muted-foreground hover:text-foreground">
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {p.pillar ? (
                  <span className="inline-flex items-center gap-1.5">
                    <PillarDot color={p.pillar.color} />
                    {p.pillar.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.post_metrics?.impressions ?? ""}</TableCell>
              <TableCell className="text-right tabular-nums">{p.post_metrics?.likes ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
