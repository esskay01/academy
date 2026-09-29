"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Frown, Play, RotateCcw, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShuttleIcon } from "@/components/brand/logo";
import {
  clampToHalf,
  distance,
  halfOf,
  laneOf,
  opponentMissChance,
  otherTeam,
  randomTarget,
  shotDuration,
  shotSpeedKmh,
  validateRallyName,
  type Lane,
  type Point,
  type Team,
} from "@/lib/rally";
import { cn } from "@/lib/utils";

// Hero court: an automatic doubles rally (attract loop). Visitors can join —
// pick a player/court, name themselves, play one rally, then return to the loop.
//
// The simulation runs in a requestAnimationFrame loop over plain refs and
// writes transforms straight to the DOM; React state is only used for the
// UI phases (menus, HUD, results), which change a few times per rally.

type Mode = "attract" | "choose" | "name" | "countdown" | "play" | "result";

type Slot = { id: number; team: Team; lane: Lane; home: Point; label: string; aiName: string };

const SLOTS: Slot[] = [
  { id: 0, team: "cyan", lane: "left", home: { x: 0.3, y: 0.26 }, label: "Top court · left", aiName: "Kabir" },
  { id: 1, team: "cyan", lane: "right", home: { x: 0.7, y: 0.26 }, label: "Top court · right", aiName: "Isha" },
  { id: 2, team: "lime", lane: "left", home: { x: 0.3, y: 0.74 }, label: "Bottom court · left", aiName: "Aarav" },
  { id: 3, team: "lime", lane: "right", home: { x: 0.7, y: 0.74 }, label: "Bottom court · right", aiName: "Diya" },
];

const TEAM_STYLE: Record<Team, { body: string; ring: string; text: string; label: string }> = {
  cyan: { body: "from-cyan-200 to-sky-500", ring: "ring-cyan-300/60", text: "text-cyan-300", label: "Cyan" },
  lime: { body: "from-[#e4ff7a] to-lime-500", ring: "ring-brand/60", text: "text-brand", label: "Lime" },
};

// The court lines' box inside the card (matches CourtLines' 400×500 viewBox: 30..370 × 30..470).
const COURT = { left: 0.075, top: 0.06, width: 0.85, height: 0.88 };

const AI_SPEED = 1.45; // court units per second
const HUMAN_SPEED = 2.1;
const AI_REACH = 0.075;
const HUMAN_REACH = 0.11;
const SWING_MS = 230;
const POINT_PAUSE_MS = 1300;

type Shot = {
  from: Point;
  to: Point;
  start: number;
  dur: number; // ms
  peak: number;
  hitter: number;
  receiver: number;
  miss: boolean; // AI receiver is (secretly) going to be wrong-footed
  smash: boolean;
};

type Sim = {
  mode: "attract" | "idle" | "play";
  pos: Point[];
  swingAt: number[];
  shot: Shot | null;
  rest: Point; // shuttle position when no shot is in flight
  pauseUntil: number;
  server: number;
  rallyShots: number;
  rallyLen: number; // attract: shots before someone "misses"
  human: number | null;
  aim: Point | null; // pointer target for the human player
  keys: Set<string>;
  humanReturns: number;
  fastest: number;
};

type Result = { won: boolean; returns: number; shots: number; fastest: number };

const toPx = (p: Point, size: { w: number; h: number }) => ({
  x: (COURT.left + p.x * COURT.width) * size.w,
  y: (COURT.top + p.y * COURT.height) * size.h,
});

const newSim = (): Sim => ({
  mode: "attract",
  pos: SLOTS.map((s) => ({ ...s.home })),
  swingAt: SLOTS.map(() => -1e9),
  shot: null,
  rest: { ...SLOTS[2].home },
  pauseUntil: 0,
  server: 2,
  rallyShots: 0,
  rallyLen: 8,
  human: null,
  aim: null,
  keys: new Set(),
  humanReturns: 0,
  fastest: 0,
});

export function CourtGame({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const reduce = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const playerEls = useRef<(HTMLDivElement | null)[]>([]);
  const racketEls = useRef<(HTMLDivElement | null)[]>([]);
  const shuttleEl = useRef<HTMLDivElement>(null);
  const shadowEl = useRef<HTMLDivElement>(null);
  const rippleLayer = useRef<HTMLDivElement>(null);
  const sim = useRef<Sim>(newSim());
  const size = useRef({ w: 1, h: 1 });
  const visible = useRef(true);
  const playerName = useRef("");

  const [mode, setMode] = useState<Mode>("attract");
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [returns, setReturns] = useState(0);
  const [score, setScore] = useState({ cyan: 0, lime: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [lastRally, setLastRally] = useState<{ name: string; won: boolean; returns: number } | null>(null);
  const [autoBack, setAutoBack] = useState(10);

  // Callbacks the loop needs, kept in a ref so the loop itself never restarts.
  const events = useRef<{ point: (winner: Team) => void; humanHit: (n: number) => void; rallyOver: (r: Result) => void }>({
    point: () => {},
    humanHit: () => {},
    rallyOver: () => {},
  });

  // ---- simulation -----------------------------------------------------------

  const launch = useCallback((hitter: number, now: number) => {
    const s = sim.current;
    const from = { ...s.pos[hitter] };
    const hitterTeam = SLOTS[hitter].team;
    const recvTeam = otherTeam(hitterTeam);
    const humanReceives = s.mode === "play" && s.human !== null && SLOTS[s.human].team === recvTeam;

    // The serve always goes to the visitor, and later shots usually do, so they stay involved.
    const lane: Lane | undefined =
      humanReceives && (s.rallyShots === 0 || Math.random() < 0.65) ? SLOTS[s.human!].lane : undefined;
    const to = randomTarget(halfOf(recvTeam), lane);
    const receiver = SLOTS.find((sl) => sl.team === recvTeam && sl.lane === laneOf(to.x))!.id;

    const smash = Math.random() < (s.mode === "play" ? 0.18 + s.rallyShots * 0.02 : 0.2);
    const dist = distance(from, to);
    const dur = shotDuration(dist, { smash, rallyShots: s.mode === "play" ? s.rallyShots : 0 }) * 1000;

    let miss = false;
    if (s.mode === "attract") miss = s.rallyShots + 1 >= s.rallyLen;
    else if (s.mode === "play" && receiver !== s.human) {
      const humanTeam = SLOTS[s.human!].team;
      // Opponents only start missing once the visitor has returned at least once,
      // so a rally is never won without the visitor touching the shuttle.
      miss =
        SLOTS[receiver].team === humanTeam
          ? Math.random() < 0.04
          : s.humanReturns > 0 && Math.random() < opponentMissChance(s.humanReturns);
    }

    s.shot = { from, to, start: now, dur, peak: smash ? 0.12 : 0.45 + dist * 0.3, hitter, receiver, miss, smash };
    s.swingAt[hitter] = now;
    s.rallyShots += 1;
    if (s.mode === "play") s.fastest = Math.max(s.fastest, shotSpeedKmh(dist, dur / 1000));
  }, []);

  const serve = useCallback(
    (server: number, now: number) => {
      const s = sim.current;
      s.rallyShots = 0;
      s.rallyLen = 6 + Math.floor(Math.random() * 8);
      s.pos[server] = { ...SLOTS[server].home };
      launch(server, now);
    },
    [launch],
  );

  const addRipple = useCallback(
    (p: Point) => {
      const layer = rippleLayer.current;
      if (!layer || reduce) return;
      const { x, y } = toPx(p, size.current);
      const el = document.createElement("span");
      el.className = "pointer-events-none absolute size-10 rounded-full border-2 border-brand";
      el.style.left = `${x - 20}px`;
      el.style.top = `${y - 20}px`;
      layer.appendChild(el);
      el.animate(
        [
          { transform: "scale(0.2)", opacity: 0.9 },
          { transform: "scale(2.6)", opacity: 0 },
        ],
        { duration: 900, easing: "ease-out" },
      ).onfinish = () => el.remove();
    },
    [reduce],
  );

  const step = useCallback(
    (now: number, dt: number) => {
      const s = sim.current;
      const shot = s.shot;

      // Who is chasing what this frame.
      const goal: (Point | null)[] = SLOTS.map((sl) => sl.home);
      let chaseSpeed = SLOTS.map(() => AI_SPEED);
      if (shot && now >= s.pauseUntil) {
        const r = shot.receiver;
        if (r !== s.human) {
          // Wrong-footed receivers drift to the wrong side, slowly.
          goal[r] = shot.miss
            ? clampToHalf({ x: shot.to.x + (shot.to.x < 0.5 ? 0.32 : -0.32), y: SLOTS[r].home.y }, halfOf(SLOTS[r].team))
            : shot.to;
          if (shot.miss) chaseSpeed = chaseSpeed.map((v, i) => (i === r ? v * 0.5 : v));
        }
      }

      SLOTS.forEach((sl, i) => {
        const p = s.pos[i];
        if (i === s.human && s.mode === "play") {
          // Arrow keys take priority; otherwise follow the pointer/finger.
          let dx = 0;
          let dy = 0;
          if (s.keys.has("ArrowLeft")) dx -= 1;
          if (s.keys.has("ArrowRight")) dx += 1;
          if (s.keys.has("ArrowUp")) dy -= 1;
          if (s.keys.has("ArrowDown")) dy += 1;
          let next: Point;
          if (dx || dy) {
            const len = Math.hypot(dx, dy);
            next = { x: p.x + (dx / len) * HUMAN_SPEED * dt, y: p.y + (dy / len) * HUMAN_SPEED * dt };
          } else if (s.aim) {
            const d = distance(p, s.aim);
            const k = d > 0 ? Math.min(1, (HUMAN_SPEED * dt) / d) : 0;
            next = { x: p.x + (s.aim.x - p.x) * k, y: p.y + (s.aim.y - p.y) * k };
          } else next = p;
          s.pos[i] = clampToHalf(next, halfOf(sl.team));
          return;
        }
        const g = goal[i]!;
        const d = distance(p, g);
        if (d < 0.001) return;
        const k = Math.min(1, (chaseSpeed[i] * dt) / d);
        s.pos[i] = { x: p.x + (g.x - p.x) * k, y: p.y + (g.y - p.y) * k };
      });

      if (now < s.pauseUntil) return;

      if (!shot) {
        if (s.mode === "attract") serve(s.server, now);
        return;
      }

      if (now - shot.start < shot.dur) return;

      // The shuttle has arrived: returned, or a point.
      const r = shot.receiver;
      const isHuman = r === s.human && s.mode === "play";
      const reach = isHuman ? HUMAN_REACH : AI_REACH;
      const returned = !(shot.miss && !isHuman) && distance(s.pos[r], shot.to) <= reach;

      if (returned) {
        s.pos[r] = { ...shot.to };
        if (isHuman) {
          s.humanReturns += 1;
          events.current.humanHit(s.humanReturns);
        }
        launch(r, now);
        return;
      }

      // Point to the hitter's team.
      const winner = SLOTS[shot.hitter].team;
      s.rest = { ...shot.to };
      s.shot = null;
      s.pauseUntil = now + POINT_PAUSE_MS;
      addRipple(shot.to);
      events.current.point(winner);

      if (s.mode === "play" && s.human !== null) {
        const won = winner === SLOTS[s.human].team;
        events.current.rallyOver({ won, returns: s.humanReturns, shots: s.rallyShots, fastest: s.fastest });
        s.mode = "idle";
      } else if (s.mode === "attract") {
        // Winner serves next, alternating lanes.
        const lastLane = SLOTS[s.server].lane;
        s.server = SLOTS.find((sl) => sl.team === winner && sl.lane !== lastLane)!.id;
      }
    },
    [addRipple, launch, serve],
  );

  const draw = useCallback((now: number) => {
    const s = sim.current;
    SLOTS.forEach((sl, i) => {
      const el = playerEls.current[i];
      if (el) {
        const { x, y } = toPx(s.pos[i], size.current);
        el.style.transform = `translate(${x}px, ${y}px)`;
      }
      const racket = racketEls.current[i];
      if (racket) {
        const t = (now - s.swingAt[i]) / SWING_MS;
        const swing = t >= 0 && t < 1 ? -70 + 140 * t : -25;
        const base = sl.team === "cyan" ? 180 : 0; // rackets face the net
        racket.style.transform = `rotate(${base + swing}deg)`;
      }
    });

    const shuttle = shuttleEl.current;
    const shadow = shadowEl.current;
    if (!shuttle || !shadow) return;
    let ground = s.rest;
    let height = 0;
    let angle = 0;
    if (s.shot) {
      const p = Math.min(1, (now - s.shot.start) / s.shot.dur);
      const e = 1 - (1 - p) * (1 - p); // shuttles decelerate
      ground = { x: s.shot.from.x + (s.shot.to.x - s.shot.from.x) * e, y: s.shot.from.y + (s.shot.to.y - s.shot.from.y) * e };
      height = 4 * p * (1 - p) * s.shot.peak;
      const a = toPx(s.shot.from, size.current);
      const b = toPx(s.shot.to, size.current);
      angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI - 90; // cork leads
    } else if (s.mode === "attract" && now >= s.pauseUntil) {
      ground = s.pos[s.server];
    }
    const g = toPx(ground, size.current);
    const lift = height * 90; // px the shuttle appears above its shadow
    shuttle.style.transform = `translate(${g.x}px, ${g.y - lift}px) rotate(${angle}deg) scale(${1 + height * 1.1})`;
    shadow.style.transform = `translate(${g.x}px, ${g.y}px) scale(${1 - Math.min(0.6, height)})`;
    shadow.style.opacity = String(0.5 - Math.min(0.35, height * 0.6));
  }, []);

  // ---- loop lifecycle -------------------------------------------------------

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => {
      size.current = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(box);
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    io.observe(box);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible.current || document.hidden) return;
      step(now, dt);
      draw(now);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [draw, step]);

  // Reduced motion: no automatic demo rally (a visitor-started rally still plays).
  useEffect(() => {
    const s = sim.current;
    if (reduce && s.mode === "attract") {
      s.mode = "idle";
      s.shot = null;
    } else if (!reduce && s.mode === "idle" && mode === "attract") {
      s.mode = "attract";
    }
  }, [reduce, mode]);

  // Tell the hero when a visitor is using the court (it hides overlapping chips).
  useEffect(() => {
    onActiveChange?.(mode !== "attract");
  }, [mode, onActiveChange]);

  // Loop → UI events.
  useEffect(() => {
    events.current.point = (winner) => setScore((sc) => ({ ...sc, [winner]: sc[winner] + 1 }));
    events.current.humanHit = (n) => setReturns(n);
    events.current.rallyOver = (r) => {
      setResult(r);
      setLastRally({ name: playerName.current, won: r.won, returns: r.returns });
      setAutoBack(10);
      setMode("result");
    };
  }, []);

  const backToDemo = useCallback(() => {
    const s = sim.current;
    s.human = null;
    s.aim = null;
    s.keys.clear();
    s.shot = null;
    s.pauseUntil = performance.now() + 600;
    s.mode = reduce ? "idle" : "attract";
    setMode("attract");
    setSlot(null);
    setResult(null);
  }, [reduce]);

  const enter = () => {
    const s = sim.current;
    s.mode = "idle"; // players walk home while the visitor picks
    s.shot = null;
    setMode("choose");
  };

  const pick = (id: number) => {
    setSlot(id);
    setNameError(null);
    setMode("name");
  };

  const playAgain = () => {
    setReturns(0);
    setCountdown(3);
    setMode("countdown");
  };

  const startRally = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateRallyName(name);
    if (!v.ok) {
      setNameError(v.error);
      return;
    }
    setName(v.name);
    playerName.current = v.name;
    playAgain();
  };

  // Countdown → play.
  useEffect(() => {
    if (mode !== "countdown") return;
    if (countdown > 0) {
      const t = window.setTimeout(() => setCountdown((c) => c - 1), 650);
      return () => window.clearTimeout(t);
    }
    const s = sim.current;
    const human = slot!;
    s.human = human;
    s.aim = null;
    s.keys.clear();
    s.humanReturns = 0;
    s.fastest = 0;
    s.pos = SLOTS.map((sl) => ({ ...sl.home }));
    s.mode = "play";
    s.pauseUntil = 0;
    // The opponent in the visitor's lane serves.
    const oppServer = SLOTS.find((sl) => sl.team !== SLOTS[human].team && sl.lane === SLOTS[human].lane)!.id;
    s.server = oppServer;
    const t = window.setTimeout(() => {
      serve(oppServer, performance.now());
      setMode("play");
    }, 0);
    return () => window.clearTimeout(t);
  }, [mode, countdown, slot, serve]);

  // Keyboard control while playing.
  useEffect(() => {
    if (mode !== "play") return;
    const keys = sim.current.keys;
    const down = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        keys.add(e.key);
      } else if (e.key === "Escape") backToDemo();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    };
  }, [mode, backToDemo]);

  // Result screen: drift back to the demo after a few seconds.
  useEffect(() => {
    if (mode !== "result") return;
    const t = window.setTimeout(() => (autoBack <= 1 ? backToDemo() : setAutoBack((n) => n - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [mode, autoBack, backToDemo]);

  const aimAt = (e: React.PointerEvent) => {
    const s = sim.current;
    if (s.mode !== "play" || s.human === null) return;
    const r = boxRef.current!.getBoundingClientRect();
    const p = {
      x: ((e.clientX - r.left) / r.width - COURT.left) / COURT.width,
      y: ((e.clientY - r.top) / r.height - COURT.top) / COURT.height,
    };
    s.aim = clampToHalf(p, halfOf(SLOTS[s.human].team));
  };

  const playing = mode === "play" || mode === "countdown";
  const humanSlot = slot !== null ? SLOTS[slot] : null;

  // ---- render ---------------------------------------------------------------

  return (
    <div
      ref={boxRef}
      data-testid="court-game"
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[2.5rem] border border-brand/25 bg-surface/90 shadow-[0_30px_80px_-30px] shadow-brand/30 select-none",
        playing && "cursor-crosshair touch-none",
      )}
      onPointerMove={aimAt}
      onPointerDown={aimAt}
    >
      <CourtLines />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="absolute inset-x-6 top-1/2 h-3 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0_2px,transparent_2px_8px)]" />
      <div ref={rippleLayer} className="pointer-events-none absolute inset-0" aria-hidden />

      {/* Players */}
      {SLOTS.map((sl) => {
        const isHuman = playing || mode === "result" ? slot === sl.id : false;
        const label = isHuman && name ? name : sl.aiName;
        return (
          <div
            key={sl.id}
            ref={(el) => {
              playerEls.current[sl.id] = el;
            }}
            data-testid={`player-${sl.id}`}
            className="pointer-events-none absolute top-0 left-0 will-change-transform"
            style={{ transform: "translate(-100px,-100px)" }}
            aria-hidden
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div
                ref={(el) => {
                  racketEls.current[sl.id] = el;
                }}
                className="absolute bottom-1/2 left-1/2 h-8 w-4 origin-bottom -translate-x-1/2"
              >
                <div className="mx-auto h-4 w-3.5 rounded-full border-2 border-white/80 bg-white/10" />
                <div className="mx-auto h-4 w-0.5 bg-white/70" />
              </div>
              <div
                className={cn(
                  "relative size-7 rounded-full bg-gradient-to-br shadow-lg ring-2",
                  TEAM_STYLE[sl.team].body,
                  isHuman ? "ring-white ring-offset-2 ring-offset-surface" : TEAM_STYLE[sl.team].ring,
                )}
              />
              <p
                className={cn(
                  "absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-full bg-ink/70 px-1.5 py-px text-[10px] font-semibold whitespace-nowrap backdrop-blur",
                  isHuman ? "text-white" : TEAM_STYLE[sl.team].text,
                )}
              >
                {isHuman ? `${label} (you)` : label}
              </p>
            </div>
          </div>
        );
      })}

      {/* Shuttle */}
      <div ref={shadowEl} aria-hidden className="pointer-events-none absolute top-0 left-0 will-change-transform">
        <div className="h-2 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black blur-[2px]" />
      </div>
      <div ref={shuttleEl} data-testid="shuttle" aria-hidden className="pointer-events-none absolute top-0 left-0 will-change-transform">
        <div className="-translate-x-1/2 -translate-y-1/2">
          <ShuttleIcon className="size-7 drop-shadow-[0_0_12px_rgba(200,245,60,0.7)]" />
        </div>
      </div>

      {/* ---- Overlays / HUD ---- */}
      <AnimatePresence mode="wait">
        {mode === "attract" && (
          <motion.div key="attract" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-x-4 top-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-rose-400" /> Doubles demo
              </span>
              <span className="rounded-full border border-white/10 bg-ink/70 px-2.5 py-1 text-[11px] font-bold backdrop-blur" aria-label={`Score: Cyan ${score.cyan}, Lime ${score.lime}`}>
                <span className="text-cyan-300">Cyan {score.cyan}</span>
                <span className="text-white/40"> – </span>
                <span className="text-brand">{score.lime} Lime</span>
              </span>
            </div>
            <div className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-2">
              {lastRally && (
                <p data-testid="last-rally" className="rounded-full bg-ink/75 px-3 py-1 text-[11px] text-white/75 backdrop-blur">
                  Last rally: <span className="font-semibold text-white">{lastRally.name}</span>{" "}
                  {lastRally.won ? "won" : "lost"} · {lastRally.returns} return{lastRally.returns === 1 ? "" : "s"}
                </p>
              )}
              <button
                type="button"
                onClick={enter}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-ink shadow-[0_0_30px_-6px] shadow-brand transition hover:scale-105"
              >
                <Play className="size-4 fill-ink" /> Play a rally
              </button>
            </div>
          </motion.div>
        )}

        {mode === "choose" && (
          <motion.div key="choose" className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center">
              <p className="inline-block rounded-full bg-ink/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">Choose your player &amp; court</p>
            </div>
            {SLOTS.map((sl) => (
              <button
                key={sl.id}
                type="button"
                onClick={() => pick(sl.id)}
                aria-label={`${sl.label} — Team ${TEAM_STYLE[sl.team].label}`}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                style={{ left: `${(COURT.left + sl.home.x * COURT.width) * 100}%`, top: `${(COURT.top + sl.home.y * COURT.height) * 100}%` }}
              >
                <span className={cn("grid size-14 place-items-center rounded-full border-2 border-dashed transition group-hover:scale-110 group-hover:border-solid", sl.team === "cyan" ? "border-cyan-300" : "border-brand")}>
                  <span className="size-2 animate-ping rounded-full bg-white" />
                </span>
                <span className="rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">{sl.label}</span>
              </button>
            ))}
            <button type="button" onClick={backToDemo} className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-ink/80 text-white/80 hover:text-white" aria-label="Cancel">
              <X className="size-4" />
            </button>
          </motion.div>
        )}

        {mode === "name" && humanSlot && (
          <motion.div key="name" className="absolute inset-0 grid place-items-center bg-ink/55 p-5 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={startRally} noValidate className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface/95 p-5 shadow-2xl">
              <p className="text-xs font-semibold tracking-wider text-white/50 uppercase">
                {humanSlot.label} · <span className={TEAM_STYLE[humanSlot.team].text}>Team {TEAM_STYLE[humanSlot.team].label}</span>
              </p>
              <label htmlFor="rally-name" className="mt-3 block text-sm font-semibold text-white">
                Your name
              </label>
              <input
                id="rally-name"
                autoFocus
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Saina"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "rally-name-error" : undefined}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand/60"
              />
              {nameError && (
                <p id="rally-name-error" className="mt-1.5 text-xs text-rose-300">
                  {nameError}
                </p>
              )}
              <p className="mt-2 text-[11px] text-white/40">Move with your mouse, finger or arrow keys. Returns are automatic when you reach the shuttle.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setMode("choose")} className="flex-1 rounded-xl border border-white/15 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                  Back
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-brand py-2 text-sm font-bold text-ink hover:bg-brand/90">
                  Start rally
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {mode === "countdown" && (
          <motion.div key="countdown" className="pointer-events-none absolute inset-0 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.span
              key={countdown}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-7xl font-extrabold text-white drop-shadow-[0_0_30px_rgba(200,245,60,0.6)]"
            >
              {countdown > 0 ? countdown : "Go!"}
            </motion.span>
          </motion.div>
        )}

        {mode === "play" && (
          <motion.div key="play" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div data-testid="game-hud" className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/10 bg-ink/75 px-3 py-1 text-xs text-white/80 backdrop-blur">
                <span className="font-semibold text-white">{name}</span> · Returns <span className="font-bold text-brand">{returns}</span>
              </span>
              <button type="button" onClick={backToDemo} className="pointer-events-auto grid size-8 place-items-center rounded-full bg-ink/80 text-white/80 hover:text-white" aria-label="Quit rally">
                <X className="size-4" />
              </button>
            </div>
            <p className="absolute inset-x-4 bottom-4 text-center text-[11px] text-white/50">Move to the shuttle — mouse, finger or arrow keys</p>
          </motion.div>
        )}

        {mode === "result" && result && (
          <motion.div key="result" className="absolute inset-0 grid place-items-center bg-ink/55 p-5 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div data-testid="rally-result" className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface/95 p-5 text-center shadow-2xl">
              {result.won ? <Trophy className="mx-auto size-10 text-amber-300" /> : <Frown className="mx-auto size-10 text-white/60" />}
              <p className="font-display mt-2 text-2xl font-bold text-white">{result.won ? `Point to you, ${name}!` : "Rally lost"}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Returns", result.returns],
                  ["Rally", `${result.shots} shots`],
                  ["Fastest", `${result.fastest} km/h`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.04] p-2">
                    <dt className="text-[10px] text-white/45 uppercase">{k}</dt>
                    <dd className="text-sm font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={playAgain} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-sm font-bold text-ink hover:bg-brand/90">
                  <RotateCcw className="size-3.5" /> Play again
                </button>
                <button type="button" onClick={backToDemo} className="flex-1 rounded-xl border border-white/15 py-2 text-sm font-semibold text-white/80 hover:bg-white/5">
                  Back to demo
                </button>
              </div>
              <p className="mt-3 text-[11px] text-white/40">Returning to the demo in {autoBack}s</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CourtLines() {
  return (
    <svg viewBox="0 0 400 500" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="2" fill="none">
        <rect x="30" y="30" width="340" height="440" />
        <line x1="55" y1="30" x2="55" y2="470" />
        <line x1="345" y1="30" x2="345" y2="470" />
        <line x1="30" y1="60" x2="370" y2="60" />
        <line x1="30" y1="440" x2="370" y2="440" />
        <line x1="30" y1="185" x2="370" y2="185" />
        <line x1="30" y1="315" x2="370" y2="315" />
        <line x1="200" y1="30" x2="200" y2="185" />
        <line x1="200" y1="315" x2="200" y2="470" />
      </g>
    </svg>
  );
}
