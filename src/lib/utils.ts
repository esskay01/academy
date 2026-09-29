import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Calendar dates ("YYYY-MM-DD") parse as UTC midnight, so format them in UTC —
// otherwise a viewer west of UTC would see the previous day.
const calendarDateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDateFmt.format(d) : dateFmt.format(d);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return inr.format(amount);
}

/** "06:30" → "6:30 AM" */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "+919876543210" → "+91 98765 43210"; other formats are shown as stored. */
export function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const m = /^\+91(\d{5})(\d{5})$/.exec(value);
  return m ? `+91 ${m[1]} ${m[2]}` : value;
}

/** "Saina Nehwal Sharma" → "Saina S." — enough to recognise, without the full name. */
export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
