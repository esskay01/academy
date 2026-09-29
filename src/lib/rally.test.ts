import { describe, expect, it } from "vitest";
import {
  clampToHalf,
  laneOf,
  opponentMissChance,
  randomTarget,
  shotDuration,
  validateRallyName,
} from "@/lib/rally";

describe("validateRallyName", () => {
  it("accepts 2–16 friendly characters and tidies spaces", () => {
    expect(validateRallyName("  Saina   N  ")).toEqual({ ok: true, name: "Saina N" });
    expect(validateRallyName("P.V. O'Neil-2")).toEqual({ ok: true, name: "P.V. O'Neil-2" });
  });

  it("rejects too short, too long and markup-ish names", () => {
    expect(validateRallyName("x").ok).toBe(false);
    expect(validateRallyName("a".repeat(17)).ok).toBe(false);
    expect(validateRallyName("<script>").ok).toBe(false);
  });
});

describe("court geometry", () => {
  it("keeps shots inside the receiving half and lane", () => {
    for (let i = 0; i < 200; i++) {
      const top = randomTarget("top", "left");
      expect(top.y).toBeGreaterThan(0);
      expect(top.y).toBeLessThan(0.5);
      expect(laneOf(top.x)).toBe("left");
      const bottom = randomTarget("bottom", "right");
      expect(bottom.y).toBeGreaterThan(0.5);
      expect(laneOf(bottom.x)).toBe("right");
    }
  });

  it("never lets a player cross the net", () => {
    expect(clampToHalf({ x: 0.5, y: 0.9 }, "top").y).toBeLessThan(0.5);
    expect(clampToHalf({ x: 0.5, y: 0.1 }, "bottom").y).toBeGreaterThan(0.5);
    expect(clampToHalf({ x: -1, y: 0.7 }, "bottom").x).toBeGreaterThan(0);
  });
});

describe("rally pacing", () => {
  it("smashes are faster and long rallies speed up, within limits", () => {
    expect(shotDuration(0.5, { smash: true })).toBeLessThan(shotDuration(0.5));
    expect(shotDuration(0.5, { rallyShots: 10 })).toBeLessThan(shotDuration(0.5));
    expect(shotDuration(0.5, { rallyShots: 1000 })).toBeGreaterThan(0.3); // floor
  });

  it("opponents miss more as the rally goes on, capped", () => {
    expect(opponentMissChance(0)).toBeLessThan(opponentMissChance(5));
    expect(opponentMissChance(1000)).toBeLessThanOrEqual(0.55);
  });
});
