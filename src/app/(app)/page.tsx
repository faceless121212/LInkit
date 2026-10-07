import Link from "next/link";
import { format } from "date-fns";
import { FlameIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OverdueList } from "@/components/dashboard/overdue-list";
import { PillarDot } from "@/components/posts/pillar-select";
import { computeDashboard } from "@/lib/dashboard";
import { postDisplayTitle } from "@/lib/posts/display";
import { listPosts } from "@/lib/posts/queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const posts = await listPosts();
  const stats = computeDashboard(posts);

  const tiles = [
    { label: "Ideas", value: stats.ideas, href: "/posts?status=idea" },
    { label: "Drafts", value: stats.drafts, href: "/posts?status=draft" },
    { label: "Scheduled this week", value: stats.scheduledThisWeek, href: "/calendar?view=week&status=scheduled" },
    { label: "Published this month", value: stats.publishedThisMonth, href: "/posts?status=published" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm" title={`Longest streak: ${stats.longestStreak} days`} data-testid="streak">
          <FlameIcon className={stats.streak > 0 ? "size-4 text-orange-500" : "size-4 text-muted-foreground"} />
          <span className="font-medium tabular-nums">{stats.streak}</span>
          <span className="text-muted-foreground">day streak</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card size="sm" className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardDescription>{t.label}</CardDescription>
                <CardTitle className="text-3xl tabular-nums" data-testid={`tile-${t.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {t.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Overdue</h2>
        <OverdueList posts={stats.overdue} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Up next</h2>
        {stats.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled.{" "}
            <Link href="/posts/new" className="underline">
              Write something
            </Link>
            .
          </p>
        ) : (
          <Card size="sm">
            <CardContent className="divide-y p-0">
              {stats.upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {p.pillar && <PillarDot color={p.pillar.color} />}
                  <Link href={`/posts/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {postDisplayTitle(p)}
                  </Link>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.scheduled_at ? format(new Date(p.scheduled_at), "EEE d MMM, HH:mm") : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
