import { PenLineIcon } from "lucide-react";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <PenLineIcon className="size-5" />
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Plan, draft and track your X posts. One place, no autoposting.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5 dark:shadow-black/30">
          <LoginForm initialError={error} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Private workspace. Sign-ups are disabled.</p>
      </div>
    </main>
  );
}
