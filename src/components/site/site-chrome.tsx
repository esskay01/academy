"use client";

import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/social-icons";

/** Page-level extras for the public site: reading progress, back-to-top and a WhatsApp shortcut. */
export function SiteChrome({ whatsapp }: { whatsapp?: string | null }) {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  const [showTop, setShowTop] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShowTop(y > 900));
  const waDigits = whatsapp?.replace(/\D/g, "");

  // One delegated listener feeds the .card-hover spotlight its cursor position.
  useEffect(() => {
    if (!matchMedia("(hover: hover)").matches) return;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".card-hover");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-brand via-emerald-400 to-cyan-400"
        style={{ scaleX: progress }}
      />
      <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
        <AnimatePresence>
          {showTop && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 10 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="glass grid size-11 place-items-center rounded-full text-white shadow-lg shadow-black/20 transition hover:text-brand-text"
            >
              <ArrowUp className="size-5" />
            </motion.button>
          )}
        </AnimatePresence>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}?text=${encodeURIComponent("Hi! I'd like to know more about coaching at the academy.")}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="theme-dark group relative grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-emerald-900/30 transition hover:scale-105"
          >
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s] motion-reduce:hidden" />
            <WhatsAppIcon className="relative size-7" />
            <span className="pointer-events-none absolute right-full mr-3 hidden rounded-xl bg-ink px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block theme-dark">
              Chat with us
            </span>
          </a>
        )}
      </div>
    </>
  );
}
