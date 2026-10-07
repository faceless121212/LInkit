"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DownloadIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PillarDot } from "@/components/posts/pillar-select";
import { POST_STATUSES, STATUS_LABELS, type Pillar, type PostStatus } from "@/lib/types";

export function ListFilters({
  pillars,
  q,
  pillar,
  status,
}: {
  pillars: Pillar[];
  q: string;
  pillar: string | null;
  status: PostStatus | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  const exportHref = `/api/posts/export?${searchParams.toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          setParams({ q: typeof value === "string" ? value : null });
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search title, notes, text…" className="w-64 pl-8" aria-label="Search" />
      </form>
      <Select
        value={pillar ?? "all"}
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
        value={status ?? "all"}
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
      <Button variant="outline" size="sm" className="ml-auto" render={<a href={exportHref} download="linkit-posts.csv" />} nativeButton={false}>
        <DownloadIcon data-icon="inline-start" />
        Export CSV
      </Button>
    </div>
  );
}
