import { describe, expect, it } from "vitest";
import { academyToday, computeEndDate, membershipProgress, paymentStatus, pickCurrentPlan } from "@/lib/membership";

describe("computeEndDate (last day, inclusive)", () => {
  it("adds months and/or days", () => {
    expect(computeEndDate("2026-01-01", 1, 0)).toBe("2026-01-31");
    expect(computeEndDate("2026-01-01", 0, 30)).toBe("2026-01-30");
    expect(computeEndDate("2026-01-15", 3, 10)).toBe("2026-04-24");
    expect(computeEndDate("2026-11-10", 2, 0)).toBe("2027-01-09"); // crosses the year
  });

  it("clamps to shorter months", () => {
    expect(computeEndDate("2026-01-31", 1, 0)).toBe("2026-02-27"); // 31 Jan + 1 month → 28 Feb, minus a day
    expect(computeEndDate("2028-01-31", 1, 0)).toBe("2028-02-28"); // leap year → 29 Feb, minus a day
  });
});

describe("membershipProgress", () => {
  const start = "2026-03-01";
  const end = computeEndDate(start, 0, 10); // 1–10 March

  it("counts today as a remaining day", () => {
    expect(membershipProgress(start, end, "2026-03-01")).toMatchObject({ phase: "active", totalDays: 10, daysLeft: 10, daysUsed: 0 });
    expect(membershipProgress(start, end, "2026-03-10")).toMatchObject({ phase: "active", daysLeft: 1, daysUsed: 9 });
  });

  it("reports upcoming and completed", () => {
    expect(membershipProgress(start, end, "2026-02-27")).toMatchObject({ phase: "upcoming", daysUntilStart: 2, daysLeft: 10 });
    expect(membershipProgress(start, end, "2026-03-11")).toMatchObject({ phase: "completed", daysLeft: 0, daysUsed: 10 });
  });
});

describe("paymentStatus", () => {
  it("derives paid / partial / unpaid from amounts", () => {
    expect(paymentStatus(4500, 4500)).toBe("paid");
    expect(paymentStatus(4500, 2000)).toBe("partial");
    expect(paymentStatus(4500, 0)).toBe("unpaid");
    expect(paymentStatus(0, 0)).toBe("paid"); // free program
  });
});

describe("academyToday", () => {
  it("uses India time, not UTC", () => {
    // 20:00 UTC on 31 Dec is already 1 Jan in India (UTC+5:30).
    expect(academyToday(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});

describe("pickCurrentPlan", () => {
  const plan = (startDate: string, endDate: string) => ({ startDate, endDate });
  const today = "2026-09-30";

  it("prefers the running plan", () => {
    const running = plan("2026-09-01", "2026-10-31");
    expect(pickCurrentPlan([plan("2026-11-01", "2026-11-30"), running, plan("2026-01-01", "2026-01-31")], today)).toBe(running);
  });

  it("falls back to the soonest upcoming plan", () => {
    const soon = plan("2026-10-05", "2026-11-04");
    expect(pickCurrentPlan([plan("2026-12-01", "2026-12-31"), soon], today)).toBe(soon);
  });

  it("falls back to the latest past plan, or nothing", () => {
    const latest = plan("2026-08-01", "2026-08-31");
    expect(pickCurrentPlan([latest, plan("2026-01-01", "2026-01-31")], today)).toBe(latest);
    expect(pickCurrentPlan([], today)).toBeUndefined();
  });
});
