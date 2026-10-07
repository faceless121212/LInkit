import { createClient } from "@/lib/supabase/server";
import type { PostWithItems } from "@/lib/types";

export const POST_WITH_RELATIONS = "*, post_items(*), pillar:pillars(*), post_metrics(*)";

export async function getPost(id: string): Promise<PostWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_WITH_RELATIONS)
    .eq("id", id)
    .order("position", { referencedTable: "post_items", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PostWithItems | null) ?? null;
}

export async function listPosts(): Promise<PostWithItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_WITH_RELATIONS)
    .order("updated_at", { ascending: false })
    .order("position", { referencedTable: "post_items", ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as PostWithItems[]) ?? [];
}
