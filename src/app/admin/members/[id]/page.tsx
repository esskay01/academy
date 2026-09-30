import { asc, eq } from "drizzle-orm";
import { ArrowLeft, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberEditForm, ResetPasswordForm } from "@/components/admin/forms";
import { MembershipManager } from "@/components/admin/membership-manager";
import { PageHeader } from "@/components/admin/page-header";
import { RoleBadge, StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { programs, user } from "@/lib/db/schema";
import { academyToday } from "@/lib/membership";
import { getMemberships } from "@/lib/membership-server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage(props: PageProps<"/admin/members/[id]">) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const [member] = await db.select().from(user).where(eq(user.id, id));
  if (!member) notFound();
  const [history, programOptions] = await Promise.all([
    getMemberships(id),
    db.select({ id: programs.id, name: programs.name, priceMonthly: programs.priceMonthly }).from(programs).orderBy(asc(programs.sortOrder), asc(programs.id)),
  ]);

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to members
      </Link>
      <PageHeader title={`Edit ${member.name}`} description={`Member since ${formatDate(member.createdAt)}`}>
        <div className="flex items-center gap-2">
          <RoleBadge role={member.role} />
          <StatusBadge status={member.status} />
        </div>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="font-display mb-5 text-xl font-bold text-white">Personal details</h2>
          <MemberEditForm member={member} />
          {member.id !== session.user.id && member.role !== "admin" && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-white">
                <KeyRound className="size-4 text-brand-text" /> Reset password
              </h3>
              <p className="mt-1 mb-5 text-sm text-white/50">
                For members who forgot their password. They are signed out everywhere and log in with the new one.
              </p>
              <ResetPasswordForm userId={member.id} />
            </div>
          )}
        </section>
        <section className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-white">Memberships & payments</h2>
          <p className="mt-1 mb-5 text-sm text-white/50">
            Record the program, fee paid and duration. The end date is calculated automatically, and the member turns inactive when their last membership ends.
          </p>
          <MembershipManager userId={member.id} items={history} programs={programOptions} today={academyToday()} />
        </section>
      </div>
    </>
  );
}
