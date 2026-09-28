import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { activateUser, approveUser, deactivateUser, rejectUser, setAdminRole } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { inputClass } from "@/components/ui/field";
import { RoleBadge, StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user, USER_STATUSES, type UserStatus } from "@/lib/db/schema";
import { capitalize, cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

const filters = [{ value: "", label: "All" }, ...USER_STATUSES.map((s) => ({ value: s, label: capitalize(s) }))];

export default async function MembersPage(props: PageProps<"/admin/members">) {
  const session = await requireAdmin();
  const { q, status } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const statusFilter = USER_STATUSES.includes(status as UserStatus) ? (status as UserStatus) : undefined;

  const conditions: SQL[] = [];
  if (statusFilter) conditions.push(eq(user.status, statusFilter));
  if (query) {
    const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.phone, pattern))!);
  }
  const members = await db
    .select()
    .from(user)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(300);

  const hrefFor = (s: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (s) params.set("status", s);
    const str = params.toString();
    return `/admin/members${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Members" description="Everyone registered with the academy. Activate, deactivate or promote members." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="relative min-w-64 flex-1" action="/admin/members">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/35" />
          <input name="q" defaultValue={query} placeholder="Search name, email or phone…" className={cn(inputClass, "pl-10")} aria-label="Search members" />
        </form>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {filters.map((f) => (
            <Link
              key={f.value}
              href={hrefFor(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                (statusFilter ?? "") === f.value ? "bg-brand text-ink" : "text-white/60 hover:text-white",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wider text-white/45 uppercase">
            <tr>
              <th className="px-5 py-4 font-medium">Member</th>
              <th className="px-5 py-4 font-medium">Phone</th>
              <th className="px-5 py-4 font-medium">Level</th>
              <th className="px-5 py-4 font-medium">Joined</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-white/45">No members match.</td>
              </tr>
            )}
            {members.map((m) => {
              const self = m.id === session.user.id;
              return (
                <tr key={m.id} data-testid="member-row" className="transition hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="flex items-center gap-2 font-medium text-white">
                      {m.name} <RoleBadge role={m.role} /> {self && <span className="text-xs text-white/40">(you)</span>}
                    </p>
                    <p className="text-xs text-white/45">{m.email}</p>
                  </td>
                  <td className="px-5 py-4 text-white/70">{m.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-white/70">{capitalize(m.skillLevel)}</td>
                  <td className="px-5 py-4 text-white/70">{formatDate(m.createdAt)}</td>
                  <td className="px-5 py-4"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {m.status === "pending" && (
                        <>
                          <ActionButton action={approveUser.bind(null, m.id)} variant="success">Approve</ActionButton>
                          <ActionButton action={rejectUser.bind(null, m.id)} variant="danger">Reject</ActionButton>
                        </>
                      )}
                      {m.status === "active" && !self && (
                        <ActionButton action={deactivateUser.bind(null, m.id)} variant="danger" confirm="Confirm deactivate">Mark inactive</ActionButton>
                      )}
                      {m.status === "inactive" && (
                        <ActionButton action={activateUser.bind(null, m.id)} variant="success">Activate</ActionButton>
                      )}
                      {!self &&
                        (m.role === "admin" ? (
                          <ActionButton action={setAdminRole.bind(null, m.id, false)} variant="ghost" confirm="Confirm remove">Remove admin</ActionButton>
                        ) : (
                          <ActionButton action={setAdminRole.bind(null, m.id, true)} variant="ghost">Make admin</ActionButton>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
