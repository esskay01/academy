"use client";

import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  formatDuration,
  membershipProgress,
  paymentStatus,
  type PaymentStatus,
} from "@/lib/membership";
import { cn, formatDate, formatINR } from "@/lib/utils";

// Chart rules followed here (dataviz skill): meters use one hue on a same-ramp
// track; labels are text ink, never the mark colour; status colours are
// reserved for payment state and always ship with an icon + label.

export type MembershipView = {
  id: number;
  programName: string;
  fee: number;
  amountPaid: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  durationDays: number;
};

const paymentStyles: Record<PaymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  partial: { label: "Partially paid", icon: CircleDashed, className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  unpaid: { label: "Unpaid", icon: AlertCircle, className: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
};

export function PaymentBadge({ fee, amountPaid }: { fee: number; amountPaid: number }) {
  const s = paymentStyles[paymentStatus(fee, amountPaid)];
  return (
    <span data-testid="payment-badge" className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", s.className)}>
      <s.icon className="size-3.5" /> {s.label}
    </span>
  );
}

/** Hover/focus tooltip whose hit area is the whole row, not just the thin bar. */
function WithTooltip({ tip, children, className }: { tip: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn("relative", className)}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 rounded-xl border border-white/10 bg-surface/95 px-3 py-2 text-xs text-white/80 shadow-xl shadow-black/50 backdrop-blur">
          {tip}
        </div>
      )}
    </div>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2.5 w-full overflow-hidden rounded-full bg-chart/25">
      {/* 4px-rounded data end, anchored at the left baseline */}
      <div className="h-full rounded-[4px] bg-chart transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Headline: days left, with a time meter (days used of total). */
export function MembershipTimeCard({ m, today }: { m: MembershipView; today: string }) {
  const p = membershipProgress(m.startDate, m.endDate, today);
  const headline =
    p.phase === "active" ? p.daysLeft : p.phase === "upcoming" ? p.daysUntilStart : 0;
  const caption =
    p.phase === "active"
      ? p.daysLeft === 1 ? "day left — last day today" : "days left"
      : p.phase === "upcoming"
        ? p.daysUntilStart === 1 ? "day until it starts" : "days until it starts"
        : "days left — completed";

  return (
    <div data-testid="membership-time">
      <p className="text-xs font-semibold tracking-wider text-white/45 uppercase">{m.programName}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-6xl font-extrabold text-white" data-testid="days-left">{headline}</span>
        <span className="text-white/60">{caption}</span>
      </p>
      <WithTooltip
        className="mt-5 py-1 outline-none"
        tip={
          <>
            <p className="font-semibold text-white">{p.daysUsed} of {p.totalDays} days used</p>
            <p>{formatDate(m.startDate)} → {formatDate(m.endDate)}</p>
          </>
        }
      >
        <Meter value={p.daysUsed} max={p.totalDays} label={`${p.daysUsed} of ${p.totalDays} days used`} />
      </WithTooltip>
      <div className="mt-2 flex justify-between text-xs text-white/45">
        <span>Start {formatDate(m.startDate)}</span>
        <span>{formatDuration(m.durationMonths, m.durationDays)}</span>
        <span>End {formatDate(m.endDate)}</span>
      </div>
    </div>
  );
}

/** One meter per program: amount paid against the fee. */
export function FeeMeters({ items }: { items: MembershipView[] }) {
  return (
    <ul className="space-y-5" data-testid="fee-chart">
      {items.map((m) => {
        const due = Math.max(0, m.fee - m.amountPaid);
        return (
          <li key={m.id}>
            <WithTooltip
              className="outline-none"
              tip={
                <>
                  <p className="font-semibold text-white">{m.programName}</p>
                  <p>Paid {formatINR(m.amountPaid)} · Due {formatINR(due)}</p>
                  <p>{formatDate(m.startDate)} → {formatDate(m.endDate)}</p>
                </>
              }
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-white">{m.programName}</span>
                <span className="flex items-center gap-2 text-white/60">
                  {formatINR(m.amountPaid)} of {formatINR(m.fee)}
                  <PaymentBadge fee={m.fee} amountPaid={m.amountPaid} />
                </span>
              </div>
              <Meter value={m.amountPaid} max={m.fee} label={`${m.programName}: paid ${m.amountPaid} of ${m.fee}`} />
            </WithTooltip>
          </li>
        );
      })}
    </ul>
  );
}
