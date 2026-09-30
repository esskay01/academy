import { describe, expect, it } from "vitest";
import { addDays, countByWeek, niceMax } from "./analytics";

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("countByWeek", () => {
  const today = "2026-09-30";

  it("builds rolling weeks ending today, oldest first", () => {
    const weeks = countByWeek([], today, 3);
    expect(weeks.map((w) => [w.start, w.end])).toEqual([
      ["2026-09-10", "2026-09-16"],
      ["2026-09-17", "2026-09-23"],
      ["2026-09-24", "2026-09-30"],
    ]);
  });

  it("puts days into the right bucket and ignores out-of-window days", () => {
    const weeks = countByWeek(["2026-09-30", "2026-09-24", "2026-09-23", "2026-09-10", "2026-09-09", "2026-10-01"], today, 3);
    expect(weeks.map((w) => w.count)).toEqual([1, 1, 2]);
  });
});

describe("niceMax", () => {
  it("rounds up to 1/2/5 steps", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(50)).toBe(50);
  });
});
