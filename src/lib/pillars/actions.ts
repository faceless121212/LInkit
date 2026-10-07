"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { Pillar } from "@/lib/types";
import type { ActionResult } from "@/lib/posts/actions";

const HEX = /^#[0-9a-f]{6}$/i;

export async function createPillar(name: string, color: string): Promise<ActionResult<Pillar>> {
  try {
    const { supabase, user } = await requireUser();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name is required." };
    if (!HEX.test(color)) return { ok: false, error: "Colour must be a hex value like #6366f1." };
    const { data, error } = await supabase
      .from("pillars")
      .insert({ user_id: user.id, name: trimmed, color: color.toLowerCase() })
      .select()
      .single();
    if (error) {
      return { ok: false, error: error.code === "23505" ? "A pillar with that name already exists." : error.message };
    }
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updatePillar(id: string, name: string, color: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name is required." };
    if (!HEX.test(color)) return { ok: false, error: "Colour must be a hex value." };
    const { error } = await supabase.from("pillars").update({ name: trimmed, color: color.toLowerCase() }).eq("id", id);
    if (error) {
      return { ok: false, error: error.code === "23505" ? "A pillar with that name already exists." : error.message };
    }
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Posts keep existing; their pillar_id becomes null via ON DELETE SET NULL. */
export async function deletePillar(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("pillars").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
