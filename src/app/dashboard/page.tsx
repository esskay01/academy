import type { Metadata } from "next";
import { connection } from "next/server";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  XCircle,
  Cake,
  KeyRound,
} from "lucide-react";
import { ChangePasswordForm } from "./change-password-form";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { RoleBadge, StatusBadge } from "@/components/ui/status-badge";
import { FeeMeters, MembershipTimeCard } from "@/components/membership/membership-charts";
import { getPublicContent } from "@/lib/content";
import { academyToday } from "@/lib/membership";
import { expireEndedMemberships, getMemberships } from "@/lib/membership-server";
import { isAdmin, requireUser } from "@/lib/dal";
import { capitalize, cn, formatDate, formatINR, formatPhone, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My dashboard" };

const statusCopy = {
  pending: {
    icon: Hourglass,
    title: "Your registration is under review",
    text: "Thanks for signing up! An academy admin will verify your details and activate your membership shortly.",
    ring: "from-amber-400/40",
  },
  active: {
    icon: CheckCircle2,
    title: "You're an active member",
    text: "Your membership is active. See the current batches below and meet your coach on court.",
    ring: "from-emerald-400/40",
  },
  inactive: {
    icon: XCircle,
    title: "Your membership is inactive",
    text: "Your account isn't active right now. Please contact the academy front desk to re-activate it.",
    ring: "from-rose-400/40",
  },
} as const;

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  // Request-time only (never prerendered at build), then settle expired
  // memberships so the status shown below is current.
  await connection();
  await expireEndedMemberships();
  const [session, content, { welcome }] = await Promise.all([
    requireUser(),
    getPublicContent(),
    props.searchParams,
  ]);
  const { user } = session;
  const rawStatus = user.status ?? "pending";
  const status = (rawStatus in statusCopy ? rawStatus : "inactive") as keyof typeof statusCopy;
  const copy = statusCopy[status];
  const settings = content.settings;
  const today = academyToday();
  const history = await getMemberships(user.id);
  // Show the running plan, else the next upcoming one, else the latest.
  const current =
    history.find((m) => m.startDate <= today && m.endDate >= today) ??
    history.filter((m) => m.startDate > today).at(-1) ??
    history[0];
  const totalPaid = history.reduce((sum, m) => sum + m.amountPaid, 0);
  const totalDue = history.reduce((sum, m) => sum + Math.max(0, m.fee - m.amountPaid), 0);

  const details = [
    { icon: UserRound, label: "Full name", value: user.name },
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Phone", value: formatPhone(user.phone) },
    { icon: Cake, label: "Date of birth", value: formatDate(user.dateOfBirth) },
    { icon: Trophy, label: "Skill level", value: capitalize(user.skillLevel ?? "beginner") },
    { icon: CalendarDays, label: "Member since", value: formatDate(user.createdAt) },
  ];

  const steps = [
    { label: "Registered", done: true },
    { label: "Admin review", done: status !== "pending" },
    { label: status === "inactive" ? "Inactive" : "Active member", done: status === "active", failed: status === "inactive" },
  ];

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-brand/10 to-transparent" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {isAdmin(session) && (
            <LinkButton href="/admin" variant="secondary" size="sm" aria-label="Admin panel">
              <ShieldCheck className="size-3.5" /> <span className="hidden sm:inline">Admin panel</span>
            </LinkButton>
          )}
          <SignOutButton />
        </div>
      </header>

      <main id="main" className="relative mx-auto max-w-6xl px-6 pt-6 pb-20">
        {welcome && status === "pending" && (
          <Reveal>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand-text">
              <Sparkles className="size-4 shrink-0" /> Registration received — welcome to the academy!
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={user.name} src={user.image} className="font-display size-20 rounded-3xl text-3xl font-extrabold shadow-[0_0_40px_-10px] shadow-brand" />
            <div>
              <p className="text-sm text-white/50">Hello,</p>
              <h1 className="font-display flex flex-wrap items-center gap-3 text-4xl font-bold text-white">
                {user.name} <RoleBadge role={user.role} />
              </h1>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Reveal delay={0.05}>
            <section className={cn("relative h-full overflow-hidden rounded-3xl bg-gradient-to-br to-transparent p-px", copy.ring)}>
              <div className="h-full rounded-3xl bg-surface p-7">
                <copy.icon className={cn("size-10", status === "active" ? "text-emerald-300" : status === "pending" ? "text-amber-300" : "text-rose-300")} />
                <h2 className="font-display mt-4 text-2xl font-bold text-white" data-testid="status-title">
                  {copy.title}
                </h2>
                <p className="mt-2 text-white/60">
                  {status === "inactive" && current && current.endDate < today
                    ? `Your ${current.programName} membership ended on ${formatDate(current.endDate)}. Renew at the front desk to become active again.`
                    : copy.text}
                </p>

                <ol className="mt-8 grid grid-cols-3 gap-2">
                  {steps.map((s, i) => (
                    <li key={s.label} className="relative">
                      <div className={cn("h-1.5 rounded-full", s.done ? "bg-brand" : s.failed ? "bg-rose-400" : "bg-white/10")} />
                      <p className={cn("mt-2 text-xs font-medium", s.done ? "text-white" : "text-white/40")}>
                        {i + 1}. {s.label}
                      </p>
                    </li>
                  ))}
                </ol>
                {user.statusUpdatedAt && (
                  <p className="mt-6 text-xs text-white/40">Status last updated {formatDate(user.statusUpdatedAt)}</p>
                )}
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="glass h-full rounded-3xl p-7">
              <h2 className="text-sm font-semibold tracking-wider text-white/50 uppercase">Personal details</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {details.map((d) => (
                  <div key={d.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <dt className="flex items-center gap-2 text-xs text-white/45">
                      <d.icon className="size-3.5" /> {d.label}
                    </dt>
                    <dd className="mt-1 truncate font-medium text-white" title={d.value}>
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <section className="mt-10" aria-labelledby="membership-heading">
            <h2 id="membership-heading" className="font-display text-2xl font-bold text-white">My membership</h2>
            {current ? (
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div className="glass rounded-3xl p-7">
                  <MembershipTimeCard m={current} today={today} />
                </div>
                <div className="glass rounded-3xl p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold tracking-wider text-white/45 uppercase">Fees by program</p>
                    <p className="text-sm text-white/60">
                      Paid <span className="font-semibold text-white">{formatINR(totalPaid)}</span>
                      {totalDue > 0 && <> · Due <span className="font-semibold text-white">{formatINR(totalDue)}</span></>}
                    </p>
                  </div>
                  <div className="mt-5">
                    <FeeMeters items={history} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="glass mt-5 rounded-3xl p-6 text-white/60">
                No membership recorded yet. Once you pay for a program, the academy records it here with your dates and days left.
              </p>
            )}
          </section>
        </Reveal>

        {status === "active" ? (
          <Reveal delay={0.15}>
            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold text-white">Current batches</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {content.slots.map((s) => (
                  <div key={s.id} className="card-hover glass rounded-2xl p-5">
                    <p className="font-semibold text-white">{s.title}</p>
                    <p className="mt-1 text-sm text-white/55">{s.days}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-text">
                      <Clock className="size-3.5" /> {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </p>
                    {s.coachName && <p className="mt-1 text-xs text-white/45">Coach: {s.coachName}</p>}
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        ) : (
          settings && (
            <Reveal delay={0.15}>
              <section className="glass mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
                <p className="text-white/70">Questions about your membership? Reach the front desk.</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white hover:border-brand/40">
                    {settings.phone}
                  </a>
                  <a href={`mailto:${settings.email}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white hover:border-brand/40">
                    {settings.email}
                  </a>
                </div>
              </section>
            </Reveal>
          )
        )}

        <Reveal delay={0.18}>
          <section id="security" className="glass mt-10 scroll-mt-6 rounded-3xl p-7" aria-labelledby="security-heading">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
              <div>
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/15 text-brand-text">
                  <KeyRound className="size-5" />
                </span>
                <h2 id="security-heading" className="font-display mt-4 text-2xl font-bold text-white">Account security</h2>
                <p className="mt-2 text-sm text-white/55">
                  Change your password any time. Changing it signs you out on every other device.
                </p>
              </div>
              <ChangePasswordForm />
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
