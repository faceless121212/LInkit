import { createClient } from "@/lib/supabase/server";
import type { Pillar } from "@/lib/types";

export async function listPillars(): Promise<Pillar[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pillars").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
