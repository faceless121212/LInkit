import { PillarsManager } from "@/components/pillars/pillars-manager";
import { listPillars } from "@/lib/pillars/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pillars" };

export default async function PillarsPage() {
  const supabase = await createClient();
  const [pillars, { data: posts }] = await Promise.all([listPillars(), supabase.from("posts").select("pillar_id")]);
  const counts: Record<string, number> = {};
  for (const p of posts ?? []) if (p.pillar_id) counts[p.pillar_id] = (counts[p.pillar_id] ?? 0) + 1;

  return <PillarsManager pillars={pillars} counts={counts} />;
}
