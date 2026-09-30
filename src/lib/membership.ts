// Pure membership date/payment rules — shared by server, client preview and tests.
// Dates are ISO "YYYY-MM-DD" strings (Postgres `date`), interpreted as calendar
// days in the academy's time zone, never as instants.

export const ACADEMY_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 86_400_000;

function toUtc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function toIso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's calendar date at the academy. */
export function academyToday(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ACADEMY_TIME_ZONE }).format(now);
}

/**
 * Last day (inclusive) of a membership: start + months + days − 1 day.
 * Months keep the day-of-month, clamped to shorter months (31 Jan + 1 month → 28/29 Feb).
 * e.g. 2026-01-01 + 1 month → 2026-01-31; 2026-01-01 + 30 days → 2026-01-30.
 */
export function computeEndDate(start: string, months: number, days: number) {
  const [y, m, d] = start.split("-").map(Number);
  const monthIndex = m! - 1 + months;
  const year = y! + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const afterMonths = Date.UTC(year, month, Math.min(d!, lastDayOfMonth));
  return toIso(afterMonths + (days - 1) * DAY_MS);
}

export type MembershipPhase = "upcoming" | "active" | "completed";

export function membershipProgress(start: string, end: string, today = academyToday()) {
  const s = toUtc(start);
  const e = toUtc(end);
  const t = toUtc(today);
  const totalDays = Math.round((e - s) / DAY_MS) + 1;
  const phase: MembershipPhase = t < s ? "upcoming" : t > e ? "completed" : "active";
  // Inclusive of today: on the last day there is 1 day left.
  const daysLeft = phase === "completed" ? 0 : Math.round((e - Math.max(t, s)) / DAY_MS) + 1;
  const daysUsed = totalDays - daysLeft;
  return { phase, totalDays, daysLeft, daysUsed, daysUntilStart: phase === "upcoming" ? Math.round((s - t) / DAY_MS) : 0 };
}

export type PaymentStatus = "paid" | "partial" | "unpaid";

export function paymentStatus(fee: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0 && fee > 0) return "unpaid";
  return amountPaid >= fee ? "paid" : "partial";
}

export function formatDuration(months: number, days: number) {
  const parts = [];
  if (months) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  return parts.join(" ") || "—";
}

/**
 * The plan to show for a member: the running one, else the next upcoming one,
 * else the most recent. `history` is ordered newest start date first.
 */
export function pickCurrentPlan<T extends { startDate: string; endDate: string }>(history: T[], today = academyToday()): T | undefined {
  return (
    history.find((m) => m.startDate <= today && m.endDate >= today) ??
    history.filter((m) => m.startDate > today).at(-1) ??
    history[0]
  );
}
