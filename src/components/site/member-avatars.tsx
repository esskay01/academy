"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CalendarDays, Trophy } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { PublicMember } from "@/lib/content";
import { capitalize } from "@/lib/utils";

const since = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

/** Recently approved players; hover, focus or tap an avatar for a short profile card. */
export function MemberAvatars({ members }: { members: PublicMember[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (members.length === 0) return null;

  return (
    <ul className="flex -space-x-3" data-testid="hero-members">
      {members.map((m, i) => {
        const open = openId === m.id;
        return (
          <li
            key={m.id}
            className="relative"
            style={{ zIndex: open ? 50 : members.length - i }}
            onMouseEnter={() => setOpenId(m.id)}
            onMouseLeave={() => setOpenId((id) => (id === m.id ? null : id))}
          >
            <button
              type="button"
              aria-label={`About ${m.name}`}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : m.id)}
              onFocus={() => setOpenId(m.id)}
              onBlur={() => setOpenId((id) => (id === m.id ? null : id))}
              className="block rounded-full border-2 border-ink transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Avatar name={m.name} src={m.image} className="size-10 text-xs" />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  role="tooltip"
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-3 w-56 rounded-2xl border border-white/10 bg-surface/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} src={m.image} className="size-11 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{m.name}</p>
                      <p className="flex items-center gap-1 text-xs text-emerald-300">
                        <BadgeCheck className="size-3.5" /> Active member
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-white/65">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-3.5 text-brand" />
                      <dt className="sr-only">Level</dt>
                      <dd>{capitalize(m.skillLevel)} player</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 text-brand" />
                      <dt className="sr-only">Joined</dt>
                      <dd>Joined {since.format(new Date(m.createdAt))}</dd>
                    </div>
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
