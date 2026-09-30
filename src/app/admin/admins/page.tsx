import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { setAdminRole } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { CreateAdminForm, PromoteForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { formatDate, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const session = await requireAdmin();
  const admins = await db.select().from(user).where(eq(user.role, "admin")).orderBy(asc(user.createdAt));

  return (
    <>
      <PageHeader title="Admins" description="People who can manage members and edit the website." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="space-y-3">
          {admins.map((a) => (
            <div key={a.id} data-testid="admin-row" className="glass flex items-center gap-4 rounded-2xl p-4">
              <span className="font-display grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-cyan-400 font-bold text-ink">
                {initials(a.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {a.name} {a.id === session.user.id && <span className="text-xs font-normal text-white/40">(you)</span>}
                </p>
                <p className="truncate text-xs text-white/45">{a.email} · since {formatDate(a.createdAt)}</p>
              </div>
              {a.id !== session.user.id && (
                <ActionButton action={setAdminRole.bind(null, a.id, false)} variant="ghost" confirm="Confirm remove">
                  Remove
                </ActionButton>
              )}
            </div>
          ))}
        </section>

        <div className="space-y-6">
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-bold text-white">Promote an existing member</h2>
            <p className="mt-1 mb-5 text-sm text-white/50">They keep their account and gain admin access (and are activated).</p>
            <PromoteForm />
          </section>
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-bold text-white">Create a new admin account</h2>
            <p className="mt-1 mb-5 text-sm text-white/50">Share the temporary password with them securely.</p>
            <CreateAdminForm />
          </section>
        </div>
      </div>
    </>
  );
}
