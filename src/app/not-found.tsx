import type { Metadata } from "next";
import { ArrowLeft, Home } from "lucide-react";
import { Logo, ShuttleIcon } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-clip px-6 py-16 text-center">
      <div aria-hidden className="court-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="absolute top-1/3 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[140px]" />
      <div className="relative flex max-w-lg flex-col items-center">
        <Logo />
        <p className="font-display text-gradient mt-12 text-[7rem] leading-none font-black tracking-tighter sm:text-[9rem]">404</p>
        <ShuttleIcon className="animate-float -mt-6 size-14 drop-shadow-[0_0_24px_rgba(200,245,60,0.5)]" />
        <h1 className="font-display mt-6 text-3xl font-bold text-white">Out of bounds!</h1>
        <p className="mt-3 text-white/60">That shot landed outside the court. The page you&apos;re after doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/" size="lg">
            <Home className="size-4" /> Back to home
          </LinkButton>
          <LinkButton href="/#schedule" variant="secondary" size="lg">
            <ArrowLeft className="size-4" /> See batches
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
