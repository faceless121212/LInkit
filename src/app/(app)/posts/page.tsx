import { Suspense } from "react";
import { ListFilters } from "@/components/posts/list-filters";
import { PostsTable } from "@/components/posts/posts-table";
import { listPillars } from "@/lib/pillars/queries";
import { queryPosts, type ListParams } from "@/lib/posts/list";

export const metadata = { title: "Posts" };

export default async function PostsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const raw = await searchParams;
  const [{ posts, params }, pillars] = await Promise.all([queryPosts(raw), listPillars()]);
  const sp = new URLSearchParams(
    Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Posts</h1>
        <span className="text-sm text-muted-foreground">{posts.length} shown</span>
      </div>
      <Suspense>
        <ListFilters pillars={pillars} q={params.q} pillar={params.pillar} status={params.status} />
      </Suspense>
      <PostsTable posts={posts} params={params} searchParams={sp} />
    </div>
  );
}
