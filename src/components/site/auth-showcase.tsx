"use client";

import { AnimatePresence, motion } from "motion/react";
import { ClipboardCheck, Rocket, UserPlus, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const facts = [
  { stat: "565 km/h", text: "Fastest smash ever recorded — Satwiksairaj Rankireddy, 2023 (Guinness World Record)." },
  { stat: "16", text: "Overlapping feathers in every feather shuttlecock." },
  { stat: "1992", text: "The year badminton made its Olympic debut, in Barcelona." },
  { stat: "1980", text: "Prakash Padukone becomes the first Indian to win the All England Championships." },
  { stat: "2", text: "Olympic medals for P. V. Sindhu — silver in Rio 2016 and bronze in Tokyo 2020." },
];

const steps = [
  { icon: UserPlus, title: "Create your account", text: "Two minutes, no fees upfront." },
  { icon: ClipboardCheck, title: "Quick admin review", text: "We verify details, usually within 24 hours." },
  { icon: Rocket, title: "Step on court", text: "Pick a batch and meet your coach." },
];

export function AuthShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % facts.length), 4500);
    return () => clearInterval(t);
  }, []);
  const fact = facts[i]!;

  return (
    <div className="space-y-6">
      <ol className="relative space-y-5 border-l border-white/10 pl-6">
        {steps.map((s, idx) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.15, duration: 0.5 }}
            className="relative"
          >
            <span className="absolute top-0.5 -left-[2.3rem] grid size-7 place-items-center rounded-full border border-brand/40 bg-ink text-brand">
              <s.icon className="size-3.5" />
            </span>
            <p className="font-semibold text-white">{s.title}</p>
            <p className="text-sm text-white/50">{s.text}</p>
          </motion.li>
        ))}
      </ol>

      <div className="glass relative max-w-md overflow-hidden rounded-2xl p-5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] text-brand uppercase">
          <Zap className="size-3.5" /> Did you know?
        </p>
        <div className="mt-3 min-h-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <p className="font-display text-gradient text-4xl font-extrabold">{fact.stat}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{fact.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {facts.map((_, idx) => (
            <span key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === i ? "w-6 bg-brand" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
