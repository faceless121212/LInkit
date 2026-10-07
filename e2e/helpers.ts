import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e-user@linkit.test";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Ensures the e2e user exists and returns its id. */
export async function ensureUser(email: string): Promise<string> {
  const admin = adminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user.id;
}

/**
 * Logs in without email: generates a magic link with the admin API and
 * verifies its token hash through /auth/confirm, which sets the session
 * cookies server-side (no PKCE verifier needed).
 */
export async function loginAs(page: Page, email: string, baseURL: string) {
  await ensureUser(email);
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw new Error(`generateLink failed: ${error?.message}`);
  await page.goto(`${baseURL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`);
  await page.waitForURL(/\/board/, { timeout: 30_000 });
}

export async function deleteUserPosts(email: string) {
  const admin = adminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return;
  await admin.from("posts").delete().eq("user_id", user.id);
}

/** Drags an element onto a target with pointer events dnd-kit recognises. */
export async function dragTo(page: Page, sourceSelector: string, targetSelector: string) {
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("drag: element not visible");
  const sx = s.x + s.width / 2;
  const sy = s.y + Math.min(20, s.height / 2);
  const tx = t.x + t.width / 2;
  const ty = t.y + 60;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 10, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}
