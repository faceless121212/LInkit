"use client";

import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharCounter } from "@/components/posts/char-counter";
import { MediaUploader } from "@/components/posts/media-uploader";

export type EditorItem = { id: string; body: string; media_paths: string[] };

export async function copyText(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Clipboard is not available");
  }
}

export function ItemEditor({
  item,
  index,
  total,
  userId,
  postId,
  mediaUrls,
  issue,
  onChange,
  onMediaUrls,
  onMove,
  onRemove,
  onAddBelow,
  beforeUpload,
}: {
  item: EditorItem;
  index: number;
  total: number;
  userId: string;
  postId: string;
  mediaUrls: Record<string, string>;
  issue?: "empty" | "too_long";
  onChange: (patch: Partial<EditorItem>) => void;
  onMediaUrls: (urls: Record<string, string>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAddBelow: () => void;
  beforeUpload: () => Promise<boolean>;
}) {
  const isThread = total > 1;
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3" data-testid="item-editor">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {isThread ? `Post ${index + 1} of ${total}` : "Post"}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy this post" onClick={() => void copyText(item.body)}>
            <CopyIcon />
          </Button>
          {isThread && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
                <ArrowUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
                <ArrowDownIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this post" onClick={onRemove}>
                <Trash2Icon />
              </Button>
            </>
          )}
        </div>
      </div>
      <Textarea
        value={item.body}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder={index === 0 ? "What's happening?" : "Continue the thread…"}
        className="min-h-28 text-[15px]"
        aria-label={`Post ${index + 1} text`}
        aria-invalid={issue === "too_long"}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MediaUploader
          userId={userId}
          postId={postId}
          itemId={item.id}
          paths={item.media_paths}
          urls={mediaUrls}
          onChange={(media_paths) => onChange({ media_paths })}
          onUrls={onMediaUrls}
          beforeUpload={beforeUpload}
        />
        <div className="flex items-center gap-3">
          {issue === "empty" && isThread && <span className="text-xs text-destructive">Empty post in thread</span>}
          <CharCounter text={item.body} />
        </div>
      </div>
      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="xs" onClick={onAddBelow}>
          <PlusIcon data-icon="inline-start" />
          Add post below
        </Button>
      </div>
    </div>
  );
}
