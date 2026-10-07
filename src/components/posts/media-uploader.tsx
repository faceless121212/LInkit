"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { mediaObjectPath, removeMedia, signedMediaUrls, uploadMedia, validateMediaFile } from "@/lib/storage";
import { MAX_MEDIA_PER_ITEM } from "@/lib/types";

export function MediaUploader({
  userId,
  postId,
  itemId,
  paths,
  urls,
  onChange,
  onUrls,
  beforeUpload,
}: {
  userId: string;
  postId: string;
  itemId: string;
  paths: string[];
  urls: Record<string, string>;
  onChange: (paths: string[]) => void;
  onUrls: (urls: Record<string, string>) => void;
  beforeUpload?: () => Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_MEDIA_PER_ITEM - paths.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    if (list.length > remaining) {
      setError(`You can add ${remaining} more image${remaining === 1 ? "" : "s"} (max ${MAX_MEDIA_PER_ITEM}).`);
      return;
    }
    for (const f of list) {
      const problem = validateMediaFile(f);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setBusy(true);
    try {
      if (beforeUpload && !(await beforeUpload())) {
        setError("Could not save the post before uploading.");
        return;
      }
      const supabase = createClient();
      const newPaths: string[] = [];
      for (const f of list) {
        const path = mediaObjectPath(userId, postId, itemId, f.name);
        await uploadMedia(supabase, path, f);
        newPaths.push(path);
      }
      onUrls(await signedMediaUrls(supabase, newPaths));
      onChange([...paths, ...newPaths]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (path: string) => {
    setError(null);
    onChange(paths.filter((p) => p !== path));
    try {
      await removeMedia(createClient(), [path]);
    } catch {
      /* server sweeps orphans on save/delete */
    }
  };

  return (
    <>
      {paths.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {paths.map((p) => (
            <div key={p} className="group relative size-24 overflow-hidden rounded-xl border bg-muted">
              {urls[p] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p]} alt="" className="size-full object-cover" />
              ) : (
                <div className="size-full animate-pulse" />
              )}
              <button
                type="button"
                onClick={() => void remove(p)}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Remove image"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
        data-testid="media-input"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-primary hover:bg-primary/10 hover:text-primary"
        disabled={busy || remaining <= 0}
        onClick={() => inputRef.current?.click()}
        aria-label={remaining <= 0 ? "Maximum 4 images" : "Add image"}
        title={remaining <= 0 ? "Maximum 4 images" : busy ? "Uploading…" : "Add image"}
      >
        <ImagePlusIcon className={busy ? "animate-pulse" : undefined} />
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </>
  );
}
