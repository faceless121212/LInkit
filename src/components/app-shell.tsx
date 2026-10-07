"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { CalendarDaysIcon, KanbanSquareIcon, LayoutDashboardIcon, ListIcon, PlusIcon, TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/board", label: "Board", icon: KanbanSquareIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/posts", label: "Posts", icon: ListIcon },
  { href: "/pillars", label: "Pillars", icon: TagIcon },
];

export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar p-3 md:flex">
        <Link href="/board" className="px-2 py-1 font-heading text-lg font-semibold">
          Linkit
        </Link>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent font-medium",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4">
          <Button render={<Link href="/posts/new" />} className="w-full" nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            New post
          </Button>
        </div>
        <div className="mt-auto flex flex-col gap-2 px-2 text-xs text-muted-foreground">
          <span className="truncate" title={email}>
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="underline underline-offset-2 hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 md:hidden">
          <Link href="/board" className="font-heading font-semibold">
            Linkit
          </Link>
          <nav className="flex gap-3 text-sm">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className={cn(pathname === href && "font-medium underline")}>
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
