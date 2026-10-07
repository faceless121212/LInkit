"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePostMetrics, type MetricsInput } from "@/lib/posts/actions";
import type { PostMetrics } from "@/lib/types";

const FIELDS: (keyof MetricsInput)[] = ["impressions", "likes", "reposts", "replies", "bookmarks"];

export function MetricsForm({ postId, metrics }: { postId: string; metrics: PostMetrics | null }) {
  const [values, setValues] = useState<Record<keyof MetricsInput, string>>({
    impressions: metrics?.impressions?.toString() ?? "",
    likes: metrics?.likes?.toString() ?? "",
    reposts: metrics?.reposts?.toString() ?? "",
    replies: metrics?.replies?.toString() ?? "",
    bookmarks: metrics?.bookmarks?.toString() ?? "",
  });
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    const payload = Object.fromEntries(
      FIELDS.map((f) => [f, values[f] === "" ? null : Math.max(0, Math.floor(Number(values[f])))]),
    ) as MetricsInput;
    const res = await savePostMetrics(postId, payload);
    setPending(false);
    if (res.ok) toast.success("Metrics saved");
    else toast.error(res.error);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {FIELDS.map((f) => (
          <div key={f} className="flex flex-col gap-1">
            <Label htmlFor={`metric-${f}`} className="capitalize">
              {f}
            </Label>
            <Input
              id={`metric-${f}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={values[f]}
              onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save metrics"}
        </Button>
        {metrics?.recorded_at && (
          <span className="text-xs text-muted-foreground">
            Last recorded {new Date(metrics.recorded_at).toLocaleString()}
          </span>
        )}
      </div>
    </form>
  );
}
