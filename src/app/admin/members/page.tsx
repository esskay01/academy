import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  activateUser,
  approveUser,
  deactivateUser,
  deleteMember,
  rejectUser,
  setAdminRole,
} from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { PageSizeSelect } from "@/components/admin/page-size-select";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { RoleBadge, StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { expireEndedMemberships } from "@/lib/membership-server";
import { db } from "@/lib/db";
import { memberships, user, USER_STATUSES, type Membership, type UserStatus } from "@/lib/db/schema";
import { academyToday, membershipProgress } from "@/lib/membership";
import { capitalize, cn, formatDate, formatPhone } from "@/lib/utils";
import { parsePage, parsePageSize } from "@/lib/validations";

export const metadata: Metadata = { title: "Members" };

/** A cell that, below md, prints its column name above its value (rows become cards). */
const cellClass = "block before:mb-0.5 before:block before:text-[11px] before:font-medium before:tracking-wider before:text-white/45 before:uppercase before:content-[attr(data-label)] md:table-cell md:px-5 md:py-4 md:before:hidden";

const filters = [{ value: "", label: "All" }, ...USER_STATUSES.map((s) => ({ value: s, label: capitalize(s) }))];

export default async function MembersPage(props: PageProps<"/admin/members">) {
  const session = await requireAdmin();
  // Layout and page render in parallel, so settle expiries here, before reading statuses.
  await expireEndedMemberships();
  const sp = await props.searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusFilter = USER_STATUSES.includes(sp.status as UserStatus) ? (sp.status as UserStatus) : undefined;
  const size = parsePageSize(sp.size);

  const conditions: SQL[] = [];
  if (statusFilter) conditions.push(eq(user.status, statusFilter));
  if (query) {
    const pattern = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.phone, pattern), ilike(user.memberCode, pattern))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(user).where(where);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(parsePage(sp.page), pageCount);
  const members = await db
    .select()
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(size)
    .offset((page - 1) * size);

  // Current (or latest) membership per listed member, for the Membership column.
  const today = academyToday();
  const planRows = members.length
    ? await db.select().from(memberships).where(inArray(memberships.userId, members.map((m) => m.id))).orderBy(desc(memberships.startDate))
    : [];
  const planFor = (userId: string): Membership | undefined => {
    const own = planRows.filter((p) => p.userId === userId);
    return own.find((p) => p.startDate <= today && p.endDate >= today) ?? own[0];
  };

  const hrefFor = (next: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const status = next.status ?? statusFilter ?? "";
    if (status) params.set("status", status);
    if (size !== 50) params.set("size", String(size));
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const str = params.toString();
    return `/admin/members${str ? `?${str}` : ""}`;
  };
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <>
      <PageHeader title="Members" description="Everyone registered with the academy. Edit, activate, deactivate or promote members." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="relative min-w-56 flex-1" action="/admin/members">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {size !== 50 && <input type="hidden" name="size" value={size} />}
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/35" />
          <input name="q" defaultValue={query} placeholder="Search name, email, phone or member ID…" className={cn(inputClass, "pl-10")} aria-label="Search members" />
        </form>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {filters.map((f) => (
            <Link
              key={f.value}
              href={hrefFor({ status: f.value })}
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
        {/* Below md the rows render as stacked cards (same markup; cells label themselves via data-label). */}
        <table className="block w-full text-left text-sm md:table md:min-w-[1100px]">
          <thead className="hidden border-b border-white/10 text-xs tracking-wider text-white/45 uppercase md:table-header-group">
            <tr>
              <th className="px-5 py-4 font-medium">Member</th>
              <th className="px-5 py-4 font-medium whitespace-nowrap">Phone</th>
              <th className="px-5 py-4 font-medium">Level</th>
              <th className="px-5 py-4 font-medium">Joined</th>
              <th className="px-5 py-4 font-medium">Membership</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-white/5 md:table-row-group">
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="block px-5 py-12 text-center text-white/45 md:table-cell">No members match.</td>
              </tr>
            )}
            {members.map((m) => {
              const self = m.id === session.user.id;
              return (
                <tr key={m.id} data-testid="member-row" className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 align-middle transition hover:bg-white/[0.02] md:table-row md:p-0">
                  <td className="col-span-2 block md:table-cell md:min-w-64 md:px-5 md:py-4">
                    <div className="flex items-center gap-3">
                      {/* Clicking the member opens their read-only profile. */}
                      <Link href={`/admin/members/${m.id}/view`} tabIndex={-1} aria-hidden className="shrink-0">
                        <Avatar name={m.name} src={m.image} className="size-9 text-xs" />
                      </Link>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                          <Link href={`/admin/members/${m.id}/view`} className="hover:text-brand-text hover:underline">{m.name}</Link>{" "}
                          <RoleBadge role={m.role} /> {self && <span className="text-xs text-white/40">(you)</span>}
                        </p>
                        <p className="max-w-56 truncate text-xs text-white/45" title={m.email}>{m.email}</p>
                        {m.memberCode && <p className="font-mono text-[11px] text-white/55" data-testid="member-code">{m.memberCode}</p>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Phone" className={cn(cellClass, "whitespace-nowrap text-white/70")}>{formatPhone(m.phone)}</td>
                  <td data-label="Level" className={cn(cellClass, "text-white/70")}>{capitalize(m.skillLevel)}</td>
                  <td data-label="Joined" className={cn(cellClass, "whitespace-nowrap text-white/70")}>{formatDate(m.createdAt)}</td>
                  <td data-label="Membership" className={cn(cellClass, "md:whitespace-nowrap")}><PlanCell plan={planFor(m.id)} today={today} /></td>
                  <td data-label="Status" className={cn(cellClass, "col-span-2 md:col-span-1")}><StatusBadge status={m.status} /></td>
                  <td className="col-span-2 block border-t border-white/5 pt-3 md:table-cell md:border-0 md:px-5 md:py-4">
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link href={`/admin/members/${m.id}`} className={buttonClass("ghost", "sm")}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
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
                        <>
                          <ActionButton action={activateUser.bind(null, m.id)} variant="success">Activate</ActionButton>
                          <ActionButton action={deleteMember.bind(null, m.id)} variant="danger" confirm="Delete forever?">Delete</ActionButton>
                        </>
                      )}
                      {!self &&
                        m.status !== "inactive" &&
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

      <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-white/55">
        <p data-testid="pagination-summary">
          Showing {from}–{to} of {total}
        </p>
        <div className="flex items-center gap-4">
          <PageSizeSelect value={size} />
          <div className="flex items-center gap-1">
            <PageLink href={hrefFor({ page: page - 1 })} disabled={page <= 1} label="Previous page">
              <ChevronLeft className="size-4" />
            </PageLink>
            <span className="px-2 text-white/70">
              Page {page} of {pageCount}
            </span>
            <PageLink href={hrefFor({ page: page + 1 })} disabled={page >= pageCount} label="Next page">
              <ChevronRight className="size-4" />
            </PageLink>
          </div>
        </div>
      </nav>
    </>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "grid size-8 place-items-center rounded-lg border border-white/10";
  return disabled ? (
    <span aria-disabled className={cn(cls, "opacity-30")}>{children}</span>
  ) : (
    <Link href={href} aria-label={label} className={cn(cls, "text-white hover:bg-white/10")}>{children}</Link>
  );
}

function PlanCell({ plan, today }: { plan?: Membership; today: string }) {
  if (!plan) return <span className="text-white/35">—</span>;
  const p = membershipProgress(plan.startDate, plan.endDate, today);
  return (
    <div>
      <p className="text-white/80">{plan.programName}</p>
      <p className={cn("text-xs", p.phase === "completed" ? "text-rose-300" : p.daysLeft <= 7 && p.phase === "active" ? "text-amber-200" : "text-white/45")}>
        {p.phase === "active" ? `${p.daysLeft} days left` : p.phase === "upcoming" ? `Starts in ${p.daysUntilStart} days` : `Ended ${formatDate(plan.endDate)}`}
      </p>
    </div>
  );
}
