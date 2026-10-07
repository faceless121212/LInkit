"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPillar } from "@/lib/pillars/actions";
import type { Pillar } from "@/lib/types";

const NEW = "__new__";
const NONE = "__none__";

export function PillarDot({ color, className = "" }: { color: string; className?: string }) {
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ backgroundColor: color }} aria-hidden />;
}

export function PillarSelect({
  pillars,
  value,
  onChange,
  onPillarCreated,
}: {
  pillars: Pillar[];
  value: string | null;
  onChange: (pillarId: string | null) => void;
  onPillarCreated: (pillar: Pillar) => void;
}) {
  const [creating, setCreating] = useState(false);
  const items = [
    { value: NONE, label: <span className="text-muted-foreground">No pillar</span> },
    ...pillars.map((p) => ({
      value: p.id,
      label: (
        <span className="flex items-center gap-2">
          <PillarDot color={p.color} />
          {p.name}
        </span>
      ),
    })),
    { value: NEW, label: <span>+ New pillar…</span> },
  ];

  return (
    <>
      <Select
        items={items}
        value={value ?? NONE}
        onValueChange={(v) => {
          if (v === NEW) {
            setCreating(true);
            return;
          }
          onChange(v === NONE || v == null ? null : String(v));
        }}
      >
        <SelectTrigger className="w-full" aria-label="Pillar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={String(item.value)} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CreatePillarDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(p) => {
          onPillarCreated(p);
          onChange(p.id);
          setCreating(false);
        }}
      />
    </>
  );
}

export function CreatePillarDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (pillar: Pillar) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    const res = await createPillar(name, color);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setName("");
    onCreated(res.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New pillar</DialogTitle>
          <DialogDescription>A content category, e.g. “Build in public”.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pillar-name">Name</Label>
            <Input id="pillar-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="pillar-color">Colour</Label>
            <input
              id="pillar-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border bg-transparent"
            />
            <span className="text-xs text-muted-foreground">{color}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
