"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoToLocalInput, localInputToIso } from "@/lib/tz";
import { isValidPublishedUrl } from "@/lib/posts/validation";

export type PublishedResult = { published_url: string; published_at: string };

export function PublishedUrlDialog({
  open,
  onOpenChange,
  onConfirm,
  initialUrl = "",
  initialPublishedAt,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: PublishedResult) => void | Promise<void>;
  initialUrl?: string;
  initialPublishedAt?: string | null;
  pending?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [publishedAt, setPublishedAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setPublishedAt(isoToLocalInput(initialPublishedAt ?? new Date().toISOString()));
      setError(null);
    }
  }, [open, initialUrl, initialPublishedAt]);

  const submit = async () => {
    if (!isValidPublishedUrl(url)) {
      setError("Must look like https://x.com/<user>/status/<id>");
      return;
    }
    const iso = localInputToIso(publishedAt);
    if (!iso) {
      setError("Enter the published date and time.");
      return;
    }
    await onConfirm({ published_url: url.trim(), published_at: iso });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as published</DialogTitle>
          <DialogDescription>Paste the link to the post on X.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="published-url">Published URL</Label>
            <Input
              id="published-url"
              autoFocus
              placeholder="https://x.com/you/status/123…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="published-at">Published at</Label>
            <Input
              id="published-at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Mark published"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleDateDialog({
  open,
  onOpenChange,
  onConfirm,
  initialScheduledAt,
  pending = false,
  title = "Schedule post",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scheduledAtIso: string) => void | Promise<void>;
  initialScheduledAt?: string | null;
  pending?: boolean;
  title?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(isoToLocalInput(initialScheduledAt ?? null));
      setError(null);
    }
  }, [open, initialScheduledAt]);

  const submit = async () => {
    const iso = localInputToIso(value);
    if (!iso) {
      setError("Pick a date and time.");
      return;
    }
    await onConfirm(iso);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>When do you intend to post this?</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduled-at">Scheduled for</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
