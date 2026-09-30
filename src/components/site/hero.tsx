"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ArrowRight, CalendarClock, Trophy, Users } from "lucide-react";
import { ShuttleIcon } from "@/components/brand/logo";
import { CourtGame } from "@/components/site/court-game";
import { MemberAvatars } from "@/components/site/member-avatars";
import { LinkButton } from "@/components/ui/button";
import type { PublicMember } from "@/lib/content";
import { cn } from "@/lib/utils";

type HeroProps = {
  tagline: string;
  title: string;
  subtitle: string;
  students: number;
  members: PublicMember[];
  courts: number;
  chips: { label: string | null; value: string | null }[];
};


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
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          {/* Entrance animations are CSS (animate-*), not Motion: they must not wait for hydration (LCP). */}
          <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-text">
            <ShuttleIcon className="size-4 -rotate-12" /> {tagline}
          </span>

          <h1 className="font-display mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-white sm:text-5xl xl:text-6xl">
            {words.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className={cn("animate-word inline-block", i >= words.length - 2 && "text-gradient")}
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}
              >
                {w}&nbsp;
              </span>
            ))}
          </h1>

          <p className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-white/65" style={{ animationDelay: "0.25s" }}>
            {subtitle}
          </p>

          <div className="animate-rise mt-10 flex flex-wrap gap-3" style={{ animationDelay: "0.4s" }}>
            <LinkButton href="/register" size="lg" className="group">
              Book your first session
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </LinkButton>
            <LinkButton href="/#schedule" size="lg" variant="secondary">
              <CalendarClock className="size-4" /> View batches
            </LinkButton>
          </div>

          <div className="animate-rise mt-12 flex items-center gap-4" style={{ animationDelay: "0.55s" }}>
            <MemberAvatars members={members} />
            <p className="text-sm text-white/60">
              <span className="font-semibold text-white">{students.toLocaleString("en-IN")}+ players</span> training across {courts} pro courts
            </p>
          </div>
        </div>

        {/* Visual: doubles demo loop — visitors can join and play a rally */}
        <div className="animate-court-in relative mx-auto aspect-[4/5] w-full max-w-md" style={{ animationDelay: "0.15s" }}>
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
        </div>
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
