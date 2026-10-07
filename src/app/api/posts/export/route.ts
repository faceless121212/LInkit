import { NextResponse, type NextRequest } from "next/server";
import { postsToCsv, queryPosts } from "@/lib/posts/list";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const { posts } = await queryPosts({
    q: sp.get("q") ?? undefined,
    pillar: sp.get("pillar") ?? undefined,
    status: sp.get("status") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    dir: sp.get("dir") ?? undefined,
  });

  const csv = postsToCsv(posts);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linkit-posts-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
