"use client";

import { CalendarClock, Lock } from "lucide-react";
import { useState } from "react";
import { deleteMembership, saveMembership } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AddPanel, EditableItem } from "@/components/admin/ui";
import { PaymentBadge, type MembershipView } from "@/components/membership/membership-charts";
import { Field, Input, inputClass, Select } from "@/components/ui/field";
import type { FieldErrors } from "@/lib/action-state";
import { computeEndDate, formatDuration, membershipProgress } from "@/lib/membership";
import { cn, formatDate, formatINR } from "@/lib/utils";

type ProgramOption = { id: number; name: string; priceMonthly: number };
type Item = MembershipView & { programId: number | null };

function MembershipFields({ e, item, programs, today, prefix }: { e: FieldErrors; item?: Item; programs: ProgramOption[]; today: string; prefix: string }) {
  const [programId, setProgramId] = useState(item?.programId ? String(item.programId) : "");
  const [fee, setFee] = useState(String(item?.fee ?? ""));
  const [start, setStart] = useState(item?.startDate ?? today);
  const [months, setMonths] = useState(String(item?.durationMonths ?? 1));
  const [days, setDays] = useState(String(item?.durationDays ?? 0));

  const m = Number(months) || 0;
  const d = Number(days) || 0;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const endPreview = validDate && m + d > 0 ? computeEndDate(start, m, d) : null;

  return (
    <>
      <Select
        id={`${prefix}program`}
        label="Program"
        name="programId"
        value={programId}
        onChange={(ev) => {
          setProgramId(ev.target.value);
          // Suggest monthly price × months; the admin can still edit the fee.
          const p = programs.find((x) => String(x.id) === ev.target.value);
          if (p) setFee(String(p.priceMonthly * Math.max(1, m)));
        }}
        options={[{ value: "", label: "— Choose program —" }, ...programs.map((p) => ({ value: String(p.id), label: `${p.name} (${formatINR(p.priceMonthly)}/mo)` }))]}
        error={e.programId}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={`${prefix}fee`} label="Program fee (₹)" name="fee" type="number" min={0} value={fee} onChange={(ev) => setFee(ev.target.value)} error={e.fee} />
        <Input id={`${prefix}paid`} label="Amount paid (₹)" name="amountPaid" type="number" min={0} defaultValue={item?.amountPaid ?? 0} error={e.amountPaid} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input id={`${prefix}start`} label="Membership start" name="startDate" type="date" value={start} onChange={(ev) => setStart(ev.target.value)} error={e.startDate} className="[color-scheme:dark]" />
        <Input id={`${prefix}months`} label="Duration — months" name="durationMonths" type="number" min={0} max={60} value={months} onChange={(ev) => setMonths(ev.target.value)} error={e.durationMonths} />
        <Input id={`${prefix}days`} label="Duration — days" name="durationDays" type="number" min={0} max={365} value={days} onChange={(ev) => setDays(ev.target.value)} error={e.durationDays} />
      </div>
      <Field label="Membership end (auto)" htmlFor={`${prefix}end`}>
        <div className="relative">
          {/* Deliberately no `name`: the server computes the end date itself. */}
          <input id={`${prefix}end`} readOnly disabled value={endPreview ? formatDate(endPreview) : "—"} className={cn(inputClass, "cursor-not-allowed pr-9 opacity-80")} />
          <Lock className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-white/40" />
        </div>
      </Field>
      {endPreview && (
        <p className="text-xs text-white/45">
          {formatDuration(m, d)} · {membershipProgress(start, endPreview, today).totalDays} days, last day {formatDate(endPreview)}. The member turns inactive automatically after this date.
        </p>
      )}
    </>
  );
}

function MembershipForm({ userId, item, programs, today, onDone }: { userId: string; item?: Item; programs: ProgramOption[]; today: string; onDone?: () => void }) {
  return (
    <AdminForm action={saveMembership} submitLabel={item ? "Save membership" : "Record membership"} onSuccess={onDone}>
      {(e) => (
        <>
          <input type="hidden" name="userId" value={userId} />
          {item && <input type="hidden" name="id" value={item.id} />}
          <MembershipFields e={e} item={item} programs={programs} today={today} prefix={item ? `ms-${item.id}-` : "ms-new-"} />
        </>
      )}
    </AdminForm>
  );
}

export function MembershipManager({ userId, items, programs, today }: { userId: string; items: Item[]; programs: ProgramOption[]; today: string }) {
  return (
    <div className="space-y-3">
      <AddPanel label="Record a membership / payment">
        {(done) => <MembershipForm userId={userId} programs={programs} today={today} onDone={done} />}
      </AddPanel>
      {items.length === 0 && (
        <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-white/45">No memberships recorded yet.</p>
      )}
      {items.map((m) => {
        const p = membershipProgress(m.startDate, m.endDate, today);
        return (
          <EditableItem
            key={m.id}
            muted={p.phase === "completed"}
            renderForm={(done) => <MembershipForm userId={userId} item={m} programs={programs} today={today} onDone={done} />}
            deleteAction={() => deleteMembership(m.id)}
          >
            <div data-testid="membership-row">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                {m.programName}
                <PaymentBadge fee={m.fee} amountPaid={m.amountPaid} />
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs font-medium text-white/70">
                  <CalendarClock className="size-3.5" />
                  {p.phase === "active" ? `${p.daysLeft} days left` : p.phase === "upcoming" ? `Starts in ${p.daysUntilStart} days` : "Completed"}
                </span>
              </p>
              <p className="mt-1 text-sm text-white/50">
                {formatINR(m.amountPaid)} of {formatINR(m.fee)} paid · {formatDuration(m.durationMonths, m.durationDays)} · {formatDate(m.startDate)} → {formatDate(m.endDate)}
              </p>
            </div>
          </EditableItem>
        );
      })}
    </div>
  );
}
