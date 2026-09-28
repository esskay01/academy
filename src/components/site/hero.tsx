"use client";

import { motion } from "motion/react";
import { ArrowRight, CalendarClock, Sparkles, Trophy, Users } from "lucide-react";
import { ShuttleIcon } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

type HeroProps = {
  tagline: string;
  title: string;
  subtitle: string;
  students: number;
  courts: number;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero({ tagline, title, subtitle, students, courts }: HeroProps) {
  const words = title.split(" ");

  return (
    <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background: glow blobs + court lines */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="court-grid absolute inset-0 opacity-60" />
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]" />
        <div className="absolute top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-0 -left-32 h-[24rem] w-[24rem] rounded-full bg-ember/15 blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand"
          >
            <Sparkles className="size-3.5" /> {tagline}
          </motion.span>

          <h1 className="font-display mt-6 text-5xl leading-[1.02] font-extrabold tracking-tight text-balance text-white sm:text-6xl lg:text-7xl">
            {words.map((w, i) => (
              <motion.span
                key={`${w}-${i}`}
                className={i >= words.length - 2 ? "text-gradient inline-block" : "inline-block"}
                initial={{ opacity: 0, y: 40, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease }}
              >
                {w}&nbsp;
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/65"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65, ease }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <LinkButton href="/register" size="lg" className="group">
              Book your first session
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </LinkButton>
            <LinkButton href="/#schedule" size="lg" variant="secondary">
              <CalendarClock className="size-4" /> View batches
            </LinkButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-12 flex items-center gap-4"
          >
            <div className="flex -space-x-3">
              {["from-brand to-lime-600", "from-cyan-300 to-sky-600", "from-ember to-rose-600", "from-violet-300 to-violet-600"].map((g, i) => (
                <span key={g} className={`grid size-10 place-items-center rounded-full border-2 border-ink bg-gradient-to-br ${g} text-xs font-bold text-ink`}>
                  {["AK", "SR", "MP", "+"][i]}
                </span>
              ))}
            </div>
            <p className="text-sm text-white/60">
              <span className="font-semibold text-white">{students.toLocaleString("en-IN")}+ players</span> training across {courts} pro courts
            </p>
          </motion.div>
        </div>

        {/* Visual: stylised court with a flying shuttle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="relative mx-auto aspect-[4/5] w-full max-w-md"
        >
          <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand/30 via-cyan-400/10 to-transparent p-px">
            <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-surface/90">
              <CourtLines />
              <motion.div
                className="absolute top-[12%] left-[14%]"
                animate={{ x: [0, 180, 40, 0], y: [0, 120, 290, 0], rotate: [0, 160, 320, 360] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShuttleIcon className="size-16 drop-shadow-[0_0_20px_rgba(200,245,60,0.6)]" />
              </motion.div>
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          </div>

          <FloatingChip className="-left-6 top-16" delay={0}>
            <Trophy className="size-5 text-amber-300" />
            <div>
              <p className="text-xs text-white/50">This season</p>
              <p className="text-sm font-semibold text-white">18 state medals</p>
            </div>
          </FloatingChip>
          <FloatingChip className="-right-4 bottom-20" delay={1.2}>
            <Users className="size-5 text-cyan-300" />
            <div>
              <p className="text-xs text-white/50">Batch size</p>
              <p className="text-sm font-semibold text-white">Max 1 : 8 ratio</p>
            </div>
          </FloatingChip>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingChip({ children, className, delay }: { children: React.ReactNode; className: string; delay: number }) {
  return (
    <motion.div
      className={`glass absolute flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 ${className}`}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function CourtLines() {
  return (
    <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
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
