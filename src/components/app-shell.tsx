"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  CalendarDaysIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  ListIcon,
  LogOutIcon,
  MenuIcon,
  PenLineIcon,
  TagIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PillarChip, StatusBadge } from "@/components/posts/status-badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { PostStatus } from "@/lib/types";

export type RecentPost = {
  id: string;
  title: string;
  status: PostStatus;
  excerpt: string;
  pillar: { name: string; color: string } | null;
};

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/board", label: "Board", icon: KanbanSquareIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/posts", label: "Posts", icon: ListIcon },
  { href: "/pillars", label: "Pillars", icon: TagIcon },
];

function Logo() {
  return (
    <span className="flex items-center gap-2 font-heading text-[15px] font-semibold tracking-tight">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <PenLineIcon className="size-3.5" />
      </span>
      Linkit
    </span>
  );
}

export function AppShell({ email, recent, children }: { email: string; recent: RecentPost[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const activeRecentId = pathname.startsWith("/posts/") ? pathname.split("/")[2] : null;

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isActive(href) && "bg-sidebar-accent font-medium text-sidebar-foreground",
          )}
        >
          <Icon className="size-4 opacity-80" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <Link href="/board" className="px-1">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="px-3 pb-3">
          <Button render={<Link href="/posts/new" />} nativeButton={false} className="w-full justify-center shadow-sm shadow-primary/20">
            <PenLineIcon data-icon="inline-start" />
            New post
          </Button>
        </div>
        <div className="px-3">{nav}</div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col px-3">
          <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Recent
            <Link href="/posts" className="font-normal normal-case tracking-normal hover:text-foreground">
              All
            </Link>
          </div>
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 pb-2">
            {recent.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Your drafts will appear here.</p>}
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className={cn(
                  "group flex flex-col gap-1.5 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-sidebar-accent",
                  activeRecentId === p.id && "bg-sidebar-accent",
                )}
              >
                <span className="line-clamp-2 text-[12.5px] leading-4 text-sidebar-foreground/90">
                  {p.title || p.excerpt || <span className="text-muted-foreground">Untitled</span>}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  <StatusBadge status={p.status} />
                  {p.pillar && <PillarChip name={p.pillar.name} color={p.pillar.color} />}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-foreground uppercase">
            {email.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate" title={email}>
            {email}
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="rounded-md p-1 hover:bg-sidebar-accent hover:text-foreground" aria-label="Sign out" title="Sign out">
              <LogOutIcon className="size-3.5" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-3 py-2 backdrop-blur md:hidden">
          <Link href="/board">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Button render={<Link href="/posts/new" />} nativeButton={false} size="sm">
              <PenLineIcon data-icon="inline-start" />
              New
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
              <MenuIcon />
            </Button>
          </div>
        </header>
        {open && (
          <div className="border-b bg-sidebar p-3 md:hidden">
            {nav}
            <div className="mt-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
              <span className="truncate">{email}</span>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <form action="/auth/signout" method="post">
                  <button type="submit" className="underline underline-offset-2">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
      </div>
    </div>
  );
}
