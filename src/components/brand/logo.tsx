import Link from "next/link";
import { cn } from "@/lib/utils";

export function ShuttleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="shuttle-g" x1="10" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4ff3a" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M20 6 L44 6 L38 40 L26 40 Z" fill="url(#shuttle-g)" opacity=".25" />
      <path d="M20 6 L26 40 M32 5 L32 40 M44 6 L38 40 M23 20 H41 M25 30 H39" stroke="url(#shuttle-g)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 40 H40 L38 48 A6 6 0 0 1 26 48 Z" fill="url(#shuttle-g)" />
    </svg>
  );
}

export function Logo({ name = "Bajrang", className }: { name?: string; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 transition group-hover:rotate-12 group-hover:border-brand/40">
        <ShuttleIcon className="size-6" />
      </span>
      <span className="leading-none">
        <span className="font-display block text-lg font-bold tracking-tight text-white">{name}</span>
        <span className="block text-[10px] font-semibold tracking-[0.25em] text-brand-text uppercase">
          Badminton Academy
        </span>
      </span>
    </Link>
  );
}
