import { count, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Hourglass, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { expireEndedMemberships } from "@/lib/membership-server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { formatDate, initials } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  // Layout and page render in parallel, so settle expiries here, before reading statuses.
  await expireEndedMemberships();
  const [[stats], recent] = await Promise.all([
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${user.status} = 'active')::int`,
        pending: sql<number>`count(*) filter (where ${user.status} = 'pending')::int`,
        inactive: sql<number>`count(*) filter (where ${user.status} = 'inactive')::int`,
        admins: sql<number>`count(*) filter (where ${user.role} = 'admin')::int`,
      })
      .from(user),
    db.select().from(user).where(eq(user.status, "pending")).orderBy(desc(user.createdAt)).limit(5),
  ]);

  const cards = [
    { label: "Total members", value: stats.total, icon: Users, tone: "from-cyan-400/25 text-cyan-300", href: "/admin/members" },
    { label: "Active", value: stats.active, icon: UserCheck, tone: "from-emerald-400/25 text-emerald-300", href: "/admin/members?status=active" },
    { label: "Awaiting approval", value: stats.pending, icon: Hourglass, tone: "from-amber-400/25 text-amber-300", href: "/admin/inbox" },
    { label: "Inactive", value: stats.inactive, icon: UserX, tone: "from-rose-400/25 text-rose-300", href: "/admin/members?status=inactive" },
    { label: "Admins", value: stats.admins, icon: ShieldCheck, tone: "from-brand/25 text-brand", href: "/admin/admins" },
  ];

  return (
    <>
      <PageHeader title={`Hi, ${session.user.name.split(" ")[0]} 👋`} description="Here's what's happening at the academy today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group card-hover glass rounded-2xl p-5">
            <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br to-transparent ${c.tone}`}>
              <c.icon className="size-5" />
            </span>
            <p className="font-display mt-4 text-3xl font-bold text-white">{c.value}</p>
            <p className="text-sm text-white/50">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="glass mt-8 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Newest registrations</h2>
          <LinkButton href="/admin/inbox" variant="ghost" size="sm">
            Open inbox <ArrowRight className="size-3.5" />
          </LinkButton>
        </div>
        {recent.length === 0 ? (
          <p className="mt-6 text-sm text-white/45">Inbox zero — no registrations waiting. 🎉</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-xs font-bold">{initials(u.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{u.name}</p>
                  <p className="truncate text-xs text-white/45">{u.email} · {formatDate(u.createdAt)}</p>
                </div>
                <StatusBadge status={u.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
