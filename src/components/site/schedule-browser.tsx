"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarDays, Clock, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PublicSlot } from "@/lib/content";
import { SKILL_LEVELS } from "@/lib/constants";
import { capitalize, cn, formatTime } from "@/lib/utils";

const levelColors: Record<string, string> = {
  beginner: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
  intermediate: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
  advanced: "text-amber-200 bg-amber-400/10 border-amber-400/25",
  professional: "text-rose-300 bg-rose-400/10 border-rose-400/25",
};

type Filter = "all" | (typeof SKILL_LEVELS)[number];

/** Batch list with level filter chips; the grid re-flows with a layout animation. */
export function ScheduleBrowser({ slots }: { slots: PublicSlot[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  // Only offer levels that actually have a batch.
  const levels = SKILL_LEVELS.filter((l) => slots.some((s) => s.level === l));
  const shown = filter === "all" ? slots : slots.filter((s) => s.level === filter);

  return (
    <>
      {levels.length > 1 && (
        <div role="group" aria-label="Filter batches by level" className="mb-8 flex flex-wrap justify-center gap-2">
          {(["all", ...levels] as Filter[]).map((f) => {
            const active = filter === f;
            const count = f === "all" ? slots.length : slots.filter((s) => s.level === f).length;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f)}
                className={cn(
                  "relative isolate rounded-full px-4 py-2 text-sm font-semibold transition",
                  active ? "text-ink" : "border border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white",
                )}
              >
                {active && <motion.span layoutId="batch-filter" className="absolute inset-0 -z-10 rounded-full bg-brand" transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} />}
                <span className="relative">
                  {f === "all" ? "All batches" : capitalize(f)} <span className={active ? "text-ink/60" : "text-white/35"}>{count}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <motion.div layout className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((s) => {
            const left = Math.max(0, s.capacity - s.enrolled);
            const pct = Math.min(100, Math.round((s.enrolled / s.capacity) * 100));
            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                data-testid="batch-card"
                className="card-hover glass flex h-full flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center"
              >
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white/10 to-white/0 text-center">
                  <div>
                    <p className="font-display text-xl font-bold text-white">{formatTime(s.startTime).replace(/ (AM|PM)/, "")}</p>
                    <p className="text-[10px] font-bold tracking-widest text-white/50">{formatTime(s.startTime).slice(-2)}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", levelColors[s.level])}>{capitalize(s.level)}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{s.days}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
                    {s.coachName && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />{s.coachName}</span>}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    {/* Meter: validated chart hue on a same-hue track; status hues only for tight/full. */}
                    <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full", left === 0 ? "bg-rose-400/20" : pct > 75 ? "bg-amber-400/20" : "bg-chart/25")}>
                      <div className={cn("h-full rounded-[4px]", left === 0 ? "bg-rose-400" : pct > 75 ? "bg-amber-400" : "bg-chart")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn("text-xs font-semibold whitespace-nowrap", left === 0 ? "text-rose-300" : left <= 3 ? "text-amber-200" : "text-white/70")}>
                      {left === 0 ? "Batch full" : `${left} spots left`}
                    </span>
                  </div>
                  {left > 0 && (
                    <Link href="/register" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-text hover:underline">
                      Join this batch <ArrowRight className="size-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
