// Pure helpers for the admin overview. Dates are ISO "YYYY-MM-DD" calendar days
// in the academy's time zone (see membership.ts).

const DAY_MS = 86_400_000;

function toUtc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function addDays(iso: string, days: number) {
  return new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export type WeekBucket = { start: string; end: string; count: number };

/**
 * Counts days into rolling 7-day buckets ending today, oldest first, so the last
 * bar is always "the past 7 days". Days outside the window are ignored.
 */
export function countByWeek(days: string[], today: string, weeks = 8): WeekBucket[] {
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const end = addDays(today, -7 * (weeks - 1 - i));
    return { start: addDays(end, -6), end, count: 0 };
  });
  const first = toUtc(buckets[0]!.start);
  const t = toUtc(today);
  for (const d of days) {
    const ms = toUtc(d);
    if (ms < first || ms > t) continue;
    buckets[Math.floor((ms - first) / (7 * DAY_MS))]!.count++;
  }
  return buckets;
}

/** A tidy axis maximum: the smallest of 1·2·5 × 10ⁿ at or above the data max. */
export function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 5, 10]) if (step * pow >= max) return step * pow;
  return 10 * pow;
}
