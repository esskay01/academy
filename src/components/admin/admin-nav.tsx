"use client";

import {
  CalendarClock,
  Globe,
  Inbox,
  LayoutGrid,
  Megaphone,
  MessageSquareQuote,
  ShieldCheck,
  Tag,
  UserRoundCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "People",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutGrid },
      { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: true },
      { href: "/admin/members", label: "Members", icon: Users },
      { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/coaches", label: "Coaches", icon: UserRoundCog },
      { href: "/admin/slots", label: "Slots", icon: CalendarClock },
      { href: "/admin/programs", label: "Programs & fees", icon: Tag },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/admin/settings", label: "Site & contact", icon: Globe },
    ],
  },
];

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-6 lg:overflow-visible">
      {groups.map((g) => (
        <div key={g.label} className="flex gap-1 lg:flex-col">
          <p className="hidden px-3 pb-1 text-[10px] font-bold tracking-[0.2em] text-white/35 uppercase lg:block">{g.label}</p>
          {g.items.map((it) => {
            const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition",
                  active ? "bg-brand/15 text-brand-text" : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <it.icon className="size-4" />
                {it.label}
                {it.badge && pendingCount > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-ink" data-testid="inbox-count">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
