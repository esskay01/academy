import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("relative scroll-mt-24 py-14 sm:py-20", className)}>
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-xs font-bold tracking-[0.3em] text-brand uppercase">{eyebrow}</p>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-white/60">{description}</p>}
    </Reveal>
  );
}
