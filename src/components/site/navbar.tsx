"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { LayoutDashboard, Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#programs", label: "Programs" },
  { href: "/#coaches", label: "Coaches" },
  { href: "/#schedule", label: "Schedule" },
  { href: "/#contact", label: "Contact" },
];

type NavUser = { name: string; role?: string | null } | null;

export function Navbar({ user, academyName }: { user: NavUser; academyName?: string }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const shortName = academyName?.split(" ")[0] ?? "Bajrang";
  const home = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300",
          scrolled ? "glass shadow-2xl shadow-black/40" : "border border-transparent",
        )}
      >
        <Logo name={shortName} />
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <LinkButton href={home} size="md">
              {user.role === "admin" ? <ShieldCheck className="size-4" /> : <LayoutDashboard className="size-4" />}
              {user.role === "admin" ? "Admin panel" : "My dashboard"}
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost">Log in</LinkButton>
              <LinkButton href="/register">Join the academy</LinkButton>
            </>
          )}
        </div>
        <button
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass mx-auto mt-2 max-w-7xl rounded-2xl p-3 md:hidden"
          >
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-white/80 hover:bg-white/5">
                {l.label}
              </a>
            ))}
            <div className="mt-2 grid gap-2 border-t border-white/10 pt-3">
              {user ? (
                <LinkButton href={home}>{user.role === "admin" ? "Admin panel" : "My dashboard"}</LinkButton>
              ) : (
                <>
                  <LinkButton href="/login" variant="secondary">Log in</LinkButton>
                  <LinkButton href="/register">Join the academy</LinkButton>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
