import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, ListTreeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PillarChip, StatusBadge } from "@/components/posts/status-badge";
import { isOverdue, postDisplayTitle } from "@/lib/posts/display";
import type { NormalizedListParams, SortKey } from "@/lib/posts/list";
import type { PostWithItems } from "@/lib/types";

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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                  <PillarChip name={p.pillar.name} color={p.pillar.color} />
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
