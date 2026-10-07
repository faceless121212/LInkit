"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send magic link"}
      </Button>
      {state && (
        <p className={state.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"} role="status">
          {state.message}
        </p>
      )}
      {!state && initialError === "link" && (
        <p className="text-sm text-destructive" role="alert">
          That login link is invalid or expired. Request a new one.
        </p>
      )}
    </form>
  );
}
