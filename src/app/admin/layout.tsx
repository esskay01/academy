import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();
  const [{ pending }] = await db.select({ pending: count() }).from(user).where(eq(user.status, "pending"));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-white/10 bg-surface/80 backdrop-blur-xl lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4 lg:gap-8 lg:p-5">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="lg:hidden">
              <SignOutButton compact />
            </div>
          </div>
          <AdminNav pendingCount={pending} />
          <div className="mt-auto hidden space-y-3 lg:block">
            <Link href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
              <ExternalLink className="size-4" /> View website
            </Link>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-cyan-400 text-xs font-bold text-ink">
                {initials(session.user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{session.user.name}</p>
                <p className="truncate text-xs text-white/45">{session.user.email}</p>
              </div>
              <SignOutButton compact />
            </div>
          </div>
        </div>
      </aside>
      <main className="relative px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/[0.06] to-transparent" />
        <div className="relative mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
