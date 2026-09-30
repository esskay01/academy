import { asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { AlarmClock, ArrowRight, CalendarCheck, Hourglass, IndianRupee, ShieldCheck, UserCheck, UserX, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { OccupancyMeters, SignupsChart } from "@/components/admin/overview-charts";
import { PageHeader } from "@/components/admin/page-header";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { addDays, countByWeek } from "@/lib/analytics";
import { requireAdmin } from "@/lib/dal";
import { expireEndedMemberships } from "@/lib/membership-server";
import { db } from "@/lib/db";
import { memberships, trainingSlots, user } from "@/lib/db/schema";
import { academyToday, membershipProgress } from "@/lib/membership";
import { cn, formatDate, formatINR, formatTime } from "@/lib/utils";

const WEEKS = 8;
const EXPIRY_WINDOW_DAYS = 7;

export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  // Layout and page render in parallel, so settle expiries here, before reading statuses.
  await expireEndedMemberships();
  const today = academyToday();
  // One spare day covers the UTC ↔ India offset; countByWeek trims to the exact window.
  const windowStart = sql`now() - make_interval(days => ${WEEKS * 7 + 1})`;

  const [[stats], recent, signups, [money], openPlans, slots] = await Promise.all([
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
    db.select({ createdAt: user.createdAt }).from(user).where(gte(user.createdAt, windowStart)),
    db
      .select({
        collected: sql<number>`coalesce(sum(${memberships.amountPaid}) filter (where ${memberships.endDate} >= ${today}), 0)::int`,
        dues: sql<number>`coalesce(sum(greatest(${memberships.fee} - ${memberships.amountPaid}, 0)), 0)::int`,
        owing: sql<number>`count(distinct ${memberships.userId}) filter (where ${memberships.fee} > ${memberships.amountPaid})::int`,
      })
      .from(memberships),
    // Every running/upcoming plan, to find members whose *last* plan ends soon.
    db
      .select({ userId: memberships.userId, programName: memberships.programName, endDate: memberships.endDate, name: user.name, image: user.image })
      .from(memberships)
      .innerJoin(user, eq(user.id, memberships.userId))
      .where(gte(memberships.endDate, today)),
    db
      .select({ id: trainingSlots.id, title: trainingSlots.title, capacity: trainingSlots.capacity, enrolled: trainingSlots.enrolled, startTime: trainingSlots.startTime })
      .from(trainingSlots)
      .where(eq(trainingSlots.isActive, true))
      .orderBy(asc(trainingSlots.sortOrder), asc(trainingSlots.startTime)),
  ]);

  const weeks = countByWeek(signups.map((s) => academyToday(s.createdAt)), today, WEEKS);

  const latestByUser = new Map<string, (typeof openPlans)[number]>();
  for (const p of openPlans) {
    const cur = latestByUser.get(p.userId);
    if (!cur || p.endDate > cur.endDate) latestByUser.set(p.userId, p);
  }
  const horizon = addDays(today, EXPIRY_WINDOW_DAYS);
  const expiring = [...latestByUser.values()].filter((p) => p.endDate <= horizon).sort((a, b) => a.endDate.localeCompare(b.endDate));

  const cards = [
    { label: "Total members", value: stats.total, icon: Users, tone: "from-cyan-400/25 text-cyan-300", href: "/admin/members" },
    { label: "Active", value: stats.active, icon: UserCheck, tone: "from-emerald-400/25 text-emerald-300", href: "/admin/members?status=active" },
    { label: "Awaiting approval", value: stats.pending, icon: Hourglass, tone: "from-amber-400/25 text-amber-300", href: "/admin/inbox" },
    { label: "Inactive", value: stats.inactive, icon: UserX, tone: "from-rose-400/25 text-rose-300", href: "/admin/members?status=inactive" },
    { label: "Admins", value: stats.admins, icon: ShieldCheck, tone: "from-brand/25 text-brand-text", href: "/admin/admins" },
  ];

  return (
    <>
      <PageHeader title={`Hi, ${session.user.name.split(" ")[0]} 👋`} description={`Here's what's happening at the academy · ${formatDate(today)}`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group card-hover glass rounded-2xl p-4 last:col-span-2 sm:p-5 xl:last:col-span-1">
            <span className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br to-transparent ${c.tone}`}>
              <c.icon className="size-5" />
            </span>
            <p className="mt-4 text-3xl font-bold text-white">{c.value}</p>
            <p className="text-sm text-white/50">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="glass rounded-3xl p-6">
          <SignupsChart weeks={weeks} />
        </section>

        <section className="glass flex flex-col gap-4 rounded-3xl p-6" aria-labelledby="fees-heading">
          <h2 id="fees-heading" className="font-display text-lg font-bold text-white">Fees</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-sm text-white/55"><Wallet className="size-4" /> Collected on current plans</p>
            <p className="mt-1 text-3xl font-bold text-white" data-testid="fees-collected">{formatINR(money.collected)}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-sm text-white/55"><IndianRupee className="size-4" /> Outstanding dues</p>
            <p className="mt-1 text-3xl font-bold text-white" data-testid="fees-due">{formatINR(money.dues)}</p>
            <p className="mt-1 text-xs text-white/45">
              {money.owing === 0 ? "Everyone is paid up." : `${money.owing} member${money.owing === 1 ? "" : "s"} with a balance`}
            </p>
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass flex flex-col rounded-3xl p-6" aria-labelledby="expiring-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="expiring-heading" className="font-display flex items-center gap-2 text-lg font-bold text-white">
              <AlarmClock className="size-5 text-amber-300" /> Renewals due
            </h2>
            <span className="text-xs text-white/45">next {EXPIRY_WINDOW_DAYS} days</span>
          </div>
          {expiring.length === 0 ? (
            <div className="grid flex-1 place-items-center py-10 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <CalendarCheck className="size-7" />
                </span>
                <p className="mt-4 font-semibold text-white">All clear this week</p>
                <p className="mt-1 text-sm text-white/45">No memberships end in the next {EXPIRY_WINDOW_DAYS} days.</p>
              </div>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-white/5" data-testid="renewals">
              {expiring.map((p) => {
                const { daysLeft } = membershipProgress(today, p.endDate, today);
                return (
                  <li key={p.userId}>
                    <Link href={`/admin/members/${p.userId}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.03]">
                      <Avatar name={p.name} src={p.image} className="size-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{p.name}</p>
                        <p className="truncate text-xs text-white/45">{p.programName} · ends {formatDate(p.endDate)}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold", daysLeft <= 2 ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-amber-400/30 bg-amber-400/10 text-amber-200")}>
                        {daysLeft === 1 ? "Last day" : `${daysLeft} days left`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="glass rounded-3xl p-6" aria-labelledby="occupancy-heading">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="occupancy-heading" className="font-display text-lg font-bold text-white">Batch occupancy</h2>
            <LinkButton href="/admin/slots" variant="ghost" size="sm">Manage <ArrowRight className="size-3.5" /></LinkButton>
          </div>
          <OccupancyMeters slots={slots.map((s) => ({ ...s, time: formatTime(s.startTime) }))} />
        </section>
      </div>

      <section className="glass mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Newest registrations</h2>
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
                <Avatar name={u.name} src={u.image} className="size-9 text-xs" />
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
