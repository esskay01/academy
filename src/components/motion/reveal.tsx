"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => `${Math.round(v).toLocaleString("en-IN")}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, { duration: 1.8, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, to, value]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}
