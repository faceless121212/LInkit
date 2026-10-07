import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, MEDIA_BUCKET } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export function validateMediaFile(file: File): string | null {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
    return `${file.name}: only PNG, JPG, GIF or WebP images are allowed.`;
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return `${file.name}: larger than 5 MB.`;
  }
  return null;
}

export function mediaObjectPath(userId: string, postId: string, itemId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return `${userId}/${postId}/${itemId}/${Date.now()}-${safe}`;
}

export async function uploadMedia(client: Client, path: string, file: File) {
  const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeMedia(client: Client, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await client.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}

/** Signed URLs for private objects, keyed by path. Missing objects are skipped. */
export async function signedMediaUrls(client: Client, paths: string[], expiresInSec = 60 * 60) {
  const out: Record<string, string> = {};
  if (paths.length === 0) return out;
  const { data, error } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(paths, expiresInSec);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
  }
  return out;
}

/** Removes every object under {userId}/{postId}/ (two levels: item folders then files). */
export async function removeAllPostMedia(client: Client, userId: string, postId: string) {
  const bucket = client.storage.from(MEDIA_BUCKET);
  const root = `${userId}/${postId}`;
  const { data: itemFolders, error } = await bucket.list(root, { limit: 1000 });
  if (error) throw new Error(error.message);
  const paths: string[] = [];
  for (const folder of itemFolders ?? []) {
    // Files directly under the post folder (should not exist, but be safe)
    if (folder.id) {
      paths.push(`${root}/${folder.name}`);
      continue;
    }
    const { data: files, error: listErr } = await bucket.list(`${root}/${folder.name}`, { limit: 1000 });
    if (listErr) throw new Error(listErr.message);
    for (const f of files ?? []) paths.push(`${root}/${folder.name}/${f.name}`);
  }
  if (paths.length > 0) {
    const { error: rmErr } = await bucket.remove(paths);
    if (rmErr) throw new Error(rmErr.message);
  }
  return paths.length;
}
