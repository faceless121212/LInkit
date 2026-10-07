import { Suspense } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { formatDayKey, isValidDayKey } from "@/lib/calendar";
import { listPillars } from "@/lib/pillars/queries";
import { listPosts } from "@/lib/posts/queries";
import { POST_STATUSES, type PostStatus } from "@/lib/types";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; pillar?: string; status?: string }>;
}) {
  const [params, posts, pillars] = await Promise.all([searchParams, listPosts(), listPillars()]);
  const view = params.view === "week" ? "week" : "month";
  const anchor = isValidDayKey(params.date) ? params.date : formatDayKey(new Date());
  const pillarFilter = params.pillar && params.pillar !== "all" ? params.pillar : null;
  const statusFilter = (POST_STATUSES as string[]).includes(params.status ?? "") ? (params.status as PostStatus) : null;

  return (
    <Suspense>
      <CalendarView
        posts={posts}
        pillars={pillars}
        view={view}
        anchor={anchor}
        pillarFilter={pillarFilter}
        statusFilter={statusFilter}
      />
    </Suspense>
  );
}
