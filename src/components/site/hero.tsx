"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, CalendarClock, Trophy, Users } from "lucide-react";
import { ShuttleIcon } from "@/components/brand/logo";
import { CourtGame } from "@/components/site/court-game";
import { MemberAvatars } from "@/components/site/member-avatars";
import { LinkButton } from "@/components/ui/button";
import type { PublicMember } from "@/lib/content";

type HeroProps = {
  tagline: string;
  title: string;
  subtitle: string;
  students: number;
  members: PublicMember[];
  courts: number;
  chips: { label: string | null; value: string | null }[];
};

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero({ tagline, title, subtitle, students, courts, members, chips }: HeroProps) {
  const words = title.split(" ");
  // Stat chips overlap the court edges, so they step aside while a visitor plays.
  const [gameActive, setGameActive] = useState(false);

  // overflow-clip, not -hidden: "hidden" still makes a scroll container that a
  // click/focus/scroll-into-view can shift sideways by the decorative glow's overflow.
  return (
    <section className="relative isolate overflow-clip pt-32 pb-12 sm:pt-40 sm:pb-16">
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
            <ShuttleIcon className="size-4 -rotate-12" /> {tagline}
          </motion.span>

          <h1 className="font-display mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-white sm:text-5xl xl:text-6xl">
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
            <MemberAvatars members={members} />
            <p className="text-sm text-white/60">
              <span className="font-semibold text-white">{students.toLocaleString("en-IN")}+ players</span> training across {courts} pro courts
            </p>
          </motion.div>
        </div>

        {/* Visual: doubles demo loop — visitors can join and play a rally */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="relative mx-auto aspect-[4/5] w-full max-w-md"
        >
          <CourtGame onActiveChange={setGameActive} />

          {/* Admin-editable highlights (Site & contact → Hero highlights); blank value = hidden. */}
          {chips[0]?.value && (
            <FloatingChip className="-left-6 top-16" delay={0} hidden={gameActive}>
              <Trophy className="size-5 text-amber-300" />
              <div data-testid="hero-chip-1">
                {chips[0].label && <p className="text-xs text-white/50">{chips[0].label}</p>}
                <p className="text-sm font-semibold text-white">{chips[0].value}</p>
              </div>
            </FloatingChip>
          )}
          {chips[1]?.value && (
            <FloatingChip className="-right-4 bottom-20" delay={1.2} hidden={gameActive}>
              <Users className="size-5 text-cyan-300" />
              <div data-testid="hero-chip-2">
                {chips[1].label && <p className="text-xs text-white/50">{chips[1].label}</p>}
                <p className="text-sm font-semibold text-white">{chips[1].value}</p>
              </div>
            </FloatingChip>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function FloatingChip({ children, className, delay, hidden }: { children: React.ReactNode; className: string; delay: number; hidden: boolean }) {
  return (
    <motion.div
      aria-hidden={hidden || undefined}
      className={`glass pointer-events-none absolute z-10 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl shadow-black/50 transition-opacity duration-300 ${hidden ? "opacity-0" : "opacity-100"} ${className}`}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}
