// Pure rules for the hero "doubles court" mini-game. No DOM, no React — so the
// component stays about rendering and these stay unit-testable.
//
// Court space is normalised: x 0 (left) → 1 (right), y 0 (top) → 1 (bottom).
// The net is at y = 0.5. Team Cyan plays the top half, Team Lime the bottom half.

export type Team = "cyan" | "lime";
export type Lane = "left" | "right";
export type Half = "top" | "bottom";
export type Point = { x: number; y: number };

export const halfOf = (team: Team): Half => (team === "cyan" ? "top" : "bottom");
export const otherTeam = (team: Team): Team => (team === "cyan" ? "lime" : "cyan");
export const laneOf = (x: number): Lane => (x < 0.5 ? "left" : "right");

/** Where each half's shots may land (inside the lines, not on the net). */
const X_RANGE: Record<Lane | "any", [number, number]> = {
  left: [0.1, 0.45],
  right: [0.55, 0.9],
  any: [0.1, 0.9],
};
const Y_RANGE: Record<Half, [number, number]> = { top: [0.08, 0.42], bottom: [0.58, 0.92] };

const between = ([lo, hi]: [number, number], r: number) => lo + (hi - lo) * r;

export function randomTarget(half: Half, lane?: Lane, rnd: () => number = Math.random): Point {
  return { x: between(X_RANGE[lane ?? "any"], rnd()), y: between(Y_RANGE[half], rnd()) };
}

/** Keeps a player inside their own half (they may not cross the net). */
export function clampToHalf(p: Point, half: Half): Point {
  const x = Math.min(0.97, Math.max(0.03, p.x));
  const y = half === "top" ? Math.min(0.46, Math.max(0.02, p.y)) : Math.min(0.98, Math.max(0.54, p.y));
  return { x, y };
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Flight time in seconds. Smashes are quicker; long rallies speed up. */
export function shotDuration(dist: number, { smash = false, rallyShots = 0 } = {}) {
  const base = 0.55 + dist * 0.75;
  const pressure = Math.max(0.62, 1 - rallyShots * 0.03);
  return base * pressure * (smash ? 0.6 : 1);
}

/** A believable on-screen speed readout for a shot (km/h). */
export function shotSpeedKmh(dist: number, seconds: number) {
  // A full court length (y 0→1) is ~13.4 m.
  const metresPerSecond = (dist * 13.4) / Math.max(0.2, seconds);
  return Math.round(Math.min(420, metresPerSecond * 3.6 * 4.2));
}

export type NameResult = { ok: true; name: string } | { ok: false; error: string };

/** Visitor display name for the mini-game: 2–16 letters, digits, spaces or . ' - */
export function validateRallyName(raw: string): NameResult {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 16) return { ok: false, error: "Use 2–16 characters." };
  if (!/^[\p{L}\p{N} .'-]+$/u.test(name)) return { ok: false, error: "Letters, numbers, spaces and . ' - only." };
  return { ok: true, name };
}

/** Chance an AI opponent misses the visitor's team's shot — grows as the rally goes on. */
export function opponentMissChance(teamReturns: number) {
  return Math.min(0.55, 0.06 + teamReturns * 0.045);
}
