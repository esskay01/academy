"use client";

import { useState } from "react";
import { niceMax, type WeekBucket } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";

// Chart rules (dataviz skill): one series → no legend, the title names it; marks
// wear the chart hue, text wears text tokens; columns ≤24px with a 4px rounded
// data end on a single hairline baseline; hover/focus tooltip per mark with a hit
// area the full height of the slot; a screen-reader table is the text alternative.

const shortDate = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

export function SignupsChart({ weeks }: { weeks: WeekBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...weeks.map((w) => w.count)));
  const total = weeks.reduce((s, w) => s + w.count, 0);
  const last = weeks.length - 1;

  return (
    <figure data-testid="signups-chart">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg font-bold text-white">New registrations</span>
        <span className="text-sm text-white/50">
          <span className="font-semibold text-white">{total}</span> in the last {weeks.length} weeks
        </span>
      </figcaption>

      <div className="mt-6 flex gap-3">
        {/* y-axis: 0 / half / max, recessive */}
        <div aria-hidden className="flex h-40 flex-col justify-between pb-px text-right text-[11px] text-white/35 tabular-nums">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1">
          <div aria-hidden className="absolute inset-x-0 top-0 border-t border-white/5" />
          <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-white/5" />
          <div className="relative flex h-40 items-end border-b border-white/15" onMouseLeave={() => setHover(null)}>
            {weeks.map((w, i) => {
              const pct = (w.count / max) * 100;
              const active = hover === i;
              return (
                <div
                  key={w.end}
                  tabIndex={0}
                  role="img"
                  aria-label={`${shortDate(w.start)} – ${shortDate(w.end)}: ${w.count} registrations`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                >
                  {active && <div aria-hidden className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 rounded-lg bg-white/[0.04]" />}
                  <div
                    className={cn("relative w-full max-w-6 rounded-t-[4px] bg-chart transition-[height,opacity] duration-500", hover !== null && !active && "opacity-50")}
                    style={{ height: w.count ? `${Math.max(pct, 2)}%` : 0 }}
                  />
                  {/* Selective direct label: only the latest week. */}
                  {i === last && w.count > 0 && hover === null && (
                    <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-white" style={{ bottom: `calc(${pct}% + 4px)` }}>
                      {w.count}
                    </span>
                  )}
                  {active && (
                    <div
                      role="tooltip"
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-1 rounded-xl border border-white/10 bg-surface/95 px-3 py-2 text-xs whitespace-nowrap text-white/70 shadow-xl shadow-black/30 backdrop-blur",
                        i > last - 2 ? "right-0" : i < 2 ? "left-0" : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <p className="font-semibold text-white">{w.count} registration{w.count === 1 ? "" : "s"}</p>
                      <p>{shortDate(w.start)} – {shortDate(w.end)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div aria-hidden className="mt-2 flex justify-between text-[11px] text-white/40">
            <span>{shortDate(weeks[0]!.start)}</span>
            <span>This week</span>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Registrations per week</caption>
        <thead>
          <tr><th>Week</th><th>Registrations</th></tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.end}><td>{shortDate(w.start)} – {shortDate(w.end)}</td><td>{w.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

type SlotLoad = { id: number; title: string; capacity: number; enrolled: number; time: string };

/** One meter per batch: seats taken of capacity. Fill steps accent → warning → full. */
export function OccupancyMeters({ slots }: { slots: SlotLoad[] }) {
  if (!slots.length) return <p className="text-sm text-white/45">No active batches yet.</p>;
  return (
    <ul className="space-y-4" data-testid="occupancy">
      {slots.map((s) => {
        const pct = s.capacity > 0 ? Math.min(100, Math.round((s.enrolled / s.capacity) * 100)) : 0;
        const full = s.enrolled >= s.capacity;
        const tight = !full && pct >= 80;
        return (
          <li key={s.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-white">
                {s.title} <span className="font-normal text-white/40">· {s.time}</span>
              </span>
              <span className="shrink-0 text-white/60 tabular-nums">
                {s.enrolled}/{s.capacity}
                {full ? <span className="ml-2 text-xs font-semibold text-rose-300">Full</span> : tight ? <span className="ml-2 text-xs font-semibold text-amber-300">Almost full</span> : null}
              </span>
            </div>
            <div
              role="meter"
              aria-label={`${s.title}: ${s.enrolled} of ${s.capacity} seats taken`}
              aria-valuemin={0}
              aria-valuemax={s.capacity}
              aria-valuenow={s.enrolled}
              className={cn("h-2 w-full overflow-hidden rounded-full", full ? "bg-rose-400/20" : tight ? "bg-amber-400/20" : "bg-chart/25")}
            >
              <div className={cn("h-full rounded-[4px]", full ? "bg-rose-400" : tight ? "bg-amber-400" : "bg-chart")} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
