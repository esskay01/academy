import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  const [{ pending }] = await db.select({ pending: count() }).from(user).where(eq(user.status, "pending"));

  return (
    // minmax(0,1fr): without it the content column grows to fit wide tables
    // and the page overflows instead of the table scrolling.
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="z-30 border-b border-white/10 bg-surface/80 backdrop-blur-xl lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 lg:gap-8 lg:p-5">
          <Logo />
          <AdminNav pendingCount={pending} />
          <Link href="/" target="_blank" className="mt-auto hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white lg:flex">
            <ExternalLink className="size-4" /> View website
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Always-visible account bar: sign out is reachable from every admin page. */}
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-white/10 bg-canvas/80 px-4 py-3 backdrop-blur-xl sm:px-8 lg:px-12">
          <ThemeToggle className="mr-auto" />
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={session.user.name} src={session.user.image} className="size-9 rounded-xl text-xs" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-white">{session.user.name}</p>
              <p className="truncate text-xs text-white/45">{session.user.email}</p>
            </div>
          </div>
          <LinkButton href="/dashboard" variant="ghost" size="sm" aria-label="My account">
            <UserRound className="size-3.5" /> <span className="hidden sm:inline">My account</span>
          </LinkButton>
          <SignOutButton />
        </header>
        <main id="main" className="relative px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/[0.06] to-transparent" />
          <div className="relative mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
