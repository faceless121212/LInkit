"use client";

import { ArrowDownIcon, ArrowUpIcon, CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
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
  avatarInitial,
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
  avatarInitial: string;
  onChange: (patch: Partial<EditorItem>) => void;
  onMediaUrls: (urls: Record<string, string>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAddBelow: () => void;
  beforeUpload: () => Promise<boolean>;
}) {
  const isThread = total > 1;
  const last = index === total - 1;

  return (
    <div className="group/item relative flex gap-3" data-testid="item-editor">
      {/* Avatar + thread line */}
      <div className="flex w-10 shrink-0 flex-col items-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground" aria-hidden>
          {avatarInitial}
        </div>
        {isThread && !last && <div className="mt-1.5 w-0.5 flex-1 rounded bg-border" aria-hidden />}
      </div>

      <div className={cn("min-w-0 flex-1", !last && "pb-6")}>
        <div className="flex items-start justify-between gap-2">
          <Textarea
            value={item.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder={index === 0 ? "What's happening?" : "Continue the thread…"}
            className={cn(
              "min-h-[72px] resize-none rounded-none border-0 bg-transparent px-0 py-1 text-[16px] leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent md:text-[16px]",
              issue === "too_long" && "text-destructive",
            )}
            aria-label={`Post ${index + 1} text`}
            aria-invalid={issue === "too_long"}
          />
          {isThread && (
            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100">
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
                <ArrowUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Move down" disabled={last} onClick={() => onMove(1)}>
                <ArrowDownIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove this post" className="hover:text-destructive" onClick={onRemove}>
                <Trash2Icon />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-1">
          <MediaUploaderRow
            userId={userId}
            postId={postId}
            item={item}
            mediaUrls={mediaUrls}
            issue={issue}
            isThread={isThread}
            onChange={onChange}
            onMediaUrls={onMediaUrls}
            beforeUpload={beforeUpload}
          />
        </div>

        {/* Insert-below affordance on the thread line */}
        <div className={cn("relative mt-2 flex items-center", last ? "justify-start" : "h-0 justify-start")}>
          <Button
            type="button"
            variant={last ? "outline" : "ghost"}
            size="xs"
            onClick={onAddBelow}
            className={cn(
              "gap-1 text-muted-foreground",
              !last && "absolute -top-3 -left-[46px] size-6 rounded-full border bg-background p-0 opacity-0 transition-opacity group-hover/item:opacity-100 hover:opacity-100 focus:opacity-100",
            )}
            aria-label="Add post below"
            title="Add post below"
          >
            <PlusIcon className="size-3.5" />
            {last && <span>Add post below</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MediaUploaderRow({
  userId,
  postId,
  item,
  mediaUrls,
  issue,
  isThread,
  onChange,
  onMediaUrls,
  beforeUpload,
}: {
  userId: string;
  postId: string;
  item: EditorItem;
  mediaUrls: Record<string, string>;
  issue?: "empty" | "too_long";
  isThread: boolean;
  onChange: (patch: Partial<EditorItem>) => void;
  onMediaUrls: (urls: Record<string, string>) => void;
  beforeUpload: () => Promise<boolean>;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5">
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="Copy this post"
            title="Copy this post"
            onClick={() => void copyText(item.body)}
          >
            <CopyIcon />
          </Button>
          {issue === "empty" && isThread && <span className="ml-1 text-xs text-destructive">Empty post in thread</span>}
        </div>
        <CharCounter text={item.body} />
      </div>
    </div>
  );
}
