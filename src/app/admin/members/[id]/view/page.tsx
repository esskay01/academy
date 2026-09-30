import { eq } from "drizzle-orm";
import { ArrowLeft, Cake, CalendarDays, Droplet, IdCard, Mail, Pencil, Phone, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PaymentBadge } from "@/components/membership/membership-charts";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { RoleBadge, StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { academyToday, formatDuration, membershipProgress } from "@/lib/membership";
import { getMemberships } from "@/lib/membership-server";
import { capitalize, formatDate, formatINR, formatPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Member" };

/** Read-only member profile, opened by clicking a member in the Members list. */
export default async function ViewMemberPage(props: PageProps<"/admin/members/[id]/view">) {
  await requireAdmin();
  const { id } = await props.params;
  const [member] = await db.select().from(user).where(eq(user.id, id));
  if (!member) notFound();
  const history = await getMemberships(id);
  const today = academyToday();

  const details = [
    { icon: IdCard, label: "Member ID", value: member.memberCode ?? "Issued on approval" },
    { icon: Mail, label: "Email", value: member.email },
    { icon: Phone, label: "Phone", value: formatPhone(member.phone) },
    { icon: Cake, label: "Date of birth", value: formatDate(member.dateOfBirth) },
    { icon: Droplet, label: "Blood group", value: member.bloodGroup ?? "Not recorded" },
    { icon: Trophy, label: "Skill level", value: capitalize(member.skillLevel) },
    { icon: CalendarDays, label: "Joined", value: formatDate(member.createdAt) },
    { icon: CalendarDays, label: "Status updated", value: formatDate(member.statusUpdatedAt) },
  ];

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to members
      </Link>
      <PageHeader title={member.name} description={member.email}>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          <StatusBadge status={member.status} />
          <Link href={`/admin/members/${member.id}`} className={buttonClass("secondary", "sm")}>
            <Pencil className="size-3.5" /> Edit
          </Link>
          <Link href={`/admin/members/${member.id}/id-card`} className={buttonClass("secondary", "sm")}>
            <IdCard className="size-3.5" /> ID card
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="glass rounded-3xl p-6 sm:p-8" aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-display mb-5 text-xl font-bold text-white">Personal details</h2>
          <Avatar name={member.name} src={member.image} className="size-28 rounded-3xl text-3xl" />
          <dl className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="member-details">
            {details.map((d) => (
              <div key={d.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <dt className="flex items-center gap-2 text-xs text-white/55">
                  <d.icon className="size-3.5" /> {d.label}
                </dt>
                <dd className="mt-1 truncate font-medium text-white" title={d.value}>{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="glass rounded-3xl p-6 sm:p-8" aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="font-display mb-5 text-xl font-bold text-white">Memberships & payments</h2>
          {history.length === 0 ? (
            <p className="text-sm text-white/55">No membership recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((m) => {
                const p = membershipProgress(m.startDate, m.endDate, today);
                return (
                  <li key={m.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{m.programName}</p>
                      <PaymentBadge fee={m.fee} amountPaid={m.amountPaid} />
                    </div>
                    <p className="mt-1 text-sm text-white/65">
                      {formatDate(m.startDate)} – {formatDate(m.endDate)} · {formatDuration(m.durationMonths, m.durationDays)}
                    </p>
                    <p className="mt-1 text-sm text-white/65">
                      Paid {formatINR(m.amountPaid)} of {formatINR(m.fee)} ·{" "}
                      {p.phase === "active" ? `${p.daysLeft} days left` : p.phase === "upcoming" ? `starts in ${p.daysUntilStart} days` : "ended"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
