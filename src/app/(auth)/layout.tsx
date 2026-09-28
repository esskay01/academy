import { Quote } from "lucide-react";
import { Logo, ShuttleIcon } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/10 bg-surface lg:block">
        <div aria-hidden className="court-grid absolute inset-0 opacity-50" />
        <div aria-hidden className="absolute -top-24 -left-24 size-[28rem] rounded-full bg-brand/25 blur-[120px]" />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-[24rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div>
            <ShuttleIcon className="animate-float size-24 drop-shadow-[0_0_30px_rgba(200,245,60,0.5)]" />
            <h2 className="font-display mt-8 text-5xl leading-tight font-extrabold text-white">
              Every champion <br />
              was once a <span className="text-gradient">beginner.</span>
            </h2>
          </div>
          <figure className="glass max-w-md rounded-2xl p-5">
            <Quote className="size-5 text-brand" />
            <blockquote className="mt-2 text-sm leading-relaxed text-white/75">
              My daughter joined as a complete beginner. Eight months later she won her first district medal. The coaches genuinely care.
            </blockquote>
            <figcaption className="mt-3 text-xs text-white/45">— Parent of a U-13 player</figcaption>
          </figure>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-6 py-16">
        <div aria-hidden className="absolute top-0 right-0 size-72 rounded-full bg-brand/10 blur-[100px] lg:hidden" />
        <div className="relative w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
