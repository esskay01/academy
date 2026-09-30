"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/brand/logo";
import { Button, LinkButton } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-clip px-6 py-16 text-center">
      <div aria-hidden className="absolute top-1/3 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-ember/15 blur-[140px]" />
      <div className="relative flex max-w-md flex-col items-center">
        <Logo />
        <h1 className="font-display mt-12 text-3xl font-bold text-white">Let&apos;s replay that point</h1>
        <p className="mt-3 text-white/60">Something went wrong on our side. Try again, and if it keeps happening, contact the academy.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-white/35">Ref: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            <RotateCcw className="size-4" /> Try again
          </Button>
          <LinkButton href="/" variant="secondary" size="lg">
            Back to home
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
