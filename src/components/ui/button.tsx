import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-ink shadow-[0_0_30px_-8px] shadow-brand/60 hover:bg-brand/90 hover:shadow-brand/80",
  secondary:
    "border border-white/15 bg-white/5 text-white backdrop-blur hover:border-white/30 hover:bg-white/10",
  ghost: "text-white/80 hover:bg-white/5 hover:text-white",
  danger:
    "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  success:
    "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}
