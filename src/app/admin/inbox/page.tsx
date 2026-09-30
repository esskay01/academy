import { asc, eq } from "drizzle-orm";
import { Cake, Check, Mail, Phone, Trophy, X } from "lucide-react";
import type { Metadata } from "next";
import { approveUser, rejectUser } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { capitalize, formatDate, formatPhone, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireAdmin();
  const pending = await db.select().from(user).where(eq(user.status, "pending")).orderBy(asc(user.createdAt));

  return (
    <>
      <PageHeader
        title="Registration inbox"
        description="New sign-ups wait here until you approve (→ active) or reject (→ inactive) them."
      />
      {pending.length === 0 ? (
        <div className="glass grid place-items-center rounded-3xl px-6 py-20 text-center">
          <span className="text-5xl">🏸</span>
          <p className="font-display mt-4 text-2xl font-bold text-white">All caught up</p>
          <p className="mt-1 text-white/50">No registrations are waiting for review.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pending.map((u) => (
            <li key={u.id} data-testid="inbox-item" className="glass flex flex-col rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <span className="font-display grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-ember font-bold text-ink">
                  {initials(u.name)}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">{u.name}</p>
                  <p className="text-xs text-white/45">Registered {formatDate(u.createdAt)}</p>
                </div>
              </div>
              <dl className="mt-5 grid gap-2 text-sm text-white/70">
                <div className="flex items-center gap-2"><Mail className="size-4 text-white/40" /><dt className="sr-only">Email</dt><dd className="truncate">{u.email}</dd></div>
                <div className="flex items-center gap-2"><Phone className="size-4 text-white/40" /><dt className="sr-only">Phone</dt><dd>{formatPhone(u.phone)}</dd></div>
                <div className="flex items-center gap-2"><Cake className="size-4 text-white/40" /><dt className="sr-only">Date of birth</dt><dd>{formatDate(u.dateOfBirth)}</dd></div>
                <div className="flex items-center gap-2"><Trophy className="size-4 text-white/40" /><dt className="sr-only">Skill level</dt><dd>{capitalize(u.skillLevel)}</dd></div>
              </dl>
              <div className="mt-6 flex gap-2 border-t border-white/10 pt-5">
                <ActionButton action={approveUser.bind(null, u.id)} variant="success" size="md">
                  <Check className="size-4" /> Approve
                </ActionButton>
                <ActionButton action={rejectUser.bind(null, u.id)} variant="danger" size="md">
                  <X className="size-4" /> Reject
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
