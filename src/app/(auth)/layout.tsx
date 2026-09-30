import { Logo, ShuttleIcon } from "@/components/brand/logo";
import { AuthShowcase } from "@/components/site/auth-showcase";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/10 bg-surface lg:block">
        <div aria-hidden className="court-grid absolute inset-0 opacity-50" />
        <div aria-hidden className="absolute -top-24 -left-24 size-[28rem] rounded-full bg-brand/25 blur-[120px]" />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-[24rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-between gap-10 p-12">
          <Logo />
          <div>
            <ShuttleIcon className="animate-float size-20 drop-shadow-[0_0_30px_rgba(200,245,60,0.5)]" />
            <h2 className="font-display mt-6 text-5xl leading-tight font-extrabold text-white">
              Every champion <br />
              was once a <span className="text-gradient">beginner.</span>
            </h2>
          </div>
          <AuthShowcase />
        </div>
      </aside>
      <main id="main" className="relative flex items-center justify-center px-6 py-16">
        <ThemeToggle className="absolute top-4 right-4 z-10" />
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
