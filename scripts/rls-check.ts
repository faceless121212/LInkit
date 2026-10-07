/**
 * RLS check: creates two throwaway users, inserts a post as user A, and
 * verifies user B cannot read, update, delete it or attach items to it.
 *
 *   pnpm rls-check
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local (local Supabase or a test project).
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? `  -> ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}

async function userClient(email: string, password: string) {
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw new Error(`createUser ${email}: ${error?.message}`);
  const client = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`signIn ${email}: ${signErr.message}`);
  return { id: created.user.id, client };
}

async function main() {
  const stamp = Date.now();
  const password = `Rls-${randomUUID()}`;
  const a = await userClient(`rls-a-${stamp}@linkit.test`, password);
  const b = await userClient(`rls-b-${stamp}@linkit.test`, password);
  const postId = randomUUID();
  const itemId = randomUUID();

  try {
    // A creates a post with one item
    const { error: insErr } = await a.client.from("posts").insert({ id: postId, user_id: a.id, title: "A's secret", status: "idea", kind: "single" });
    check("A can insert own post", !insErr, insErr);
    const { error: itemErr } = await a.client.from("post_items").insert({ id: itemId, post_id: postId, position: 0, body: "secret body" });
    check("A can insert own item", !itemErr, itemErr);

    // A can read it back
    const { data: aRead } = await a.client.from("posts").select("id, post_items(id)").eq("id", postId);
    check("A can read own post with items", aRead?.length === 1 && aRead[0].post_items.length === 1, aRead);

    // B cannot read it
    const { data: bRead, error: bReadErr } = await b.client.from("posts").select("id").eq("id", postId);
    check("B cannot read A's post (0 rows)", !bReadErr && (bRead?.length ?? 0) === 0, { bRead, bReadErr });
    const { data: bItems } = await b.client.from("post_items").select("id").eq("post_id", postId);
    check("B cannot read A's items (0 rows)", (bItems?.length ?? 0) === 0, bItems);
    const { data: bSearch } = await b.client.rpc("search_posts", { q: "secret" });
    check("B cannot find A's post via search_posts", (bSearch?.length ?? 0) === 0, bSearch);

    // B cannot update or delete it (RLS filters rows -> 0 affected)
    const { data: bUpd } = await b.client.from("posts").update({ title: "hacked" }).eq("id", postId).select("id");
    check("B cannot update A's post (0 rows)", (bUpd?.length ?? 0) === 0, bUpd);
    const { data: bDel } = await b.client.from("posts").delete().eq("id", postId).select("id");
    check("B cannot delete A's post (0 rows)", (bDel?.length ?? 0) === 0, bDel);

    // B cannot attach an item to A's post
    const { error: bItemErr } = await b.client.from("post_items").insert({ post_id: postId, position: 1, body: "injected" });
    check("B cannot insert item into A's post (error)", !!bItemErr, bItemErr);

    // B cannot insert a post pretending to be A
    const { error: spoofErr } = await b.client.from("posts").insert({ user_id: a.id, title: "spoof", status: "idea", kind: "single" });
    check("B cannot insert a post with A's user_id (error)", !!spoofErr, spoofErr);

    // B cannot touch digest_log at all
    const { data: dl, error: dlErr } = await b.client.from("digest_log").select("day");
    check("B cannot read digest_log", (!!dlErr || (dl?.length ?? 0) === 0), { dl, dlErr });

    // Storage: B cannot list A's media folder
    const { data: list } = await b.client.storage.from("post-media").list(`${a.id}/${postId}`);
    check("B cannot list A's media folder", (list?.length ?? 0) === 0, list);

    // A's post is still intact
    const { data: still } = await admin.from("posts").select("title").eq("id", postId).single();
    check("A's post unchanged", still?.title === "A's secret", still);
  } finally {
    await admin.from("posts").delete().eq("id", postId);
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
  }

  console.log(failures === 0 ? "\nRLS check passed." : `\nRLS check FAILED (${failures}).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
