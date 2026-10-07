import { redirect } from "next/navigation";
import { AppShell, type RecentPost } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("posts")
    .select("id, title, status, pillar:pillars(name, color), post_items(position, body)")
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(8);

  const recent: RecentPost[] = (data ?? []).map((p) => {
    const first = [...(p.post_items ?? [])].sort((a, b) => a.position - b.position)[0]?.body.trim() ?? "";
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      excerpt: first.length > 90 ? first.slice(0, 90).trimEnd() + "…" : first,
      pillar: p.pillar ?? null,
    };
  });

  return (
    <AppShell email={user.email ?? ""} recent={recent}>
      {children}
    </AppShell>
  );
}
