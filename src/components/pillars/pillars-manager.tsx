"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/posts/dialogs";
import { CreatePillarDialog, PillarDot } from "@/components/posts/pillar-select";
import { deletePillar, updatePillar } from "@/lib/pillars/actions";
import type { Pillar } from "@/lib/types";

export function PillarsManager({ pillars, counts }: { pillars: Pillar[]; counts: Record<string, number> }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Pillar | null>(null);
  const [deleting, setDeleting] = useState<Pillar | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const openEdit = (p: Pillar) => {
    setEditing(p);
    setName(p.name);
    setColor(p.color);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setPending(true);
    const res = await updatePillar(editing.id, name, color);
    setPending(false);
    if (res.ok) {
      toast.success("Pillar updated");
      setEditing(null);
    } else toast.error(res.error);
  };

  const submitDelete = async () => {
    if (!deleting) return;
    setPending(true);
    const res = await deletePillar(deleting.id);
    setPending(false);
    if (res.ok) {
      toast.success("Pillar deleted");
      setDeleting(null);
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Pillars</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New pillar
        </Button>
      </div>
      {pillars.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pillars yet. Pillars are content categories you can filter by.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {pillars.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
              <PillarDot color={p.color} />
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {counts[p.id] ?? 0} post{(counts[p.id] ?? 0) === 1 ? "" : "s"}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreatePillarDialog open={creating} onOpenChange={setCreating} onCreated={() => setCreating(false)} />

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit pillar</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEdit();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-pillar-name">Name</Label>
              <Input id="edit-pillar-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="edit-pillar-color">Colour</Label>
              <input id="edit-pillar-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border bg-transparent" />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description="Posts in this pillar are kept and become uncategorised."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={submitDelete}
      />
    </div>
  );
}
