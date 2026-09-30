"use client";

import { motion } from "motion/react";
import { Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { loginFormSchema } from "@/lib/validations";

type Mode = "player" | "admin";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("player");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgot, setShowForgot] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = loginFormSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const { data, error } = await authClient.signIn.email({ ...parsed.data, rememberMe });
      if (error || !data) {
        setFormError(error?.message ?? "Couldn't log you in. Please try again.");
        return;
      }
      const userIsAdmin = data.user.role === "admin";
      if (mode === "admin" && !userIsAdmin) {
        await authClient.signOut();
        setFormError("This account doesn't have admin access. Use the Player tab instead.");
        return;
      }
      router.replace(next ?? (userIsAdmin ? "/admin" : "/dashboard"));
      router.refresh();
    });
  }

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Account type" className="relative grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {(["player", "admin"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition", mode === m ? "text-ink" : "text-white/60 hover:text-white")}
          >
            {mode === m && (
              <motion.span layoutId="login-tab" className="absolute inset-0 -z-10 rounded-xl bg-brand" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
            )}
            {m === "player" ? <UserRound className="size-4" /> : <ShieldCheck className="size-4" />}
            {m === "player" ? "Player login" : "Admin login"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} noValidate className="glass mt-6 space-y-5 rounded-3xl p-6 sm:p-8">
        <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
        <PasswordInput label="Password" name="password" autoComplete="current-password" placeholder="••••••••" error={errors.password} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-white/70 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.currentTarget.checked)}
              className="size-4 rounded border-white/20 bg-white/5 accent-brand"
            />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={() => setShowForgot((v) => !v)}
            aria-expanded={showForgot}
            aria-controls="forgot-help"
            className="font-medium text-brand-text/90 hover:text-brand-text hover:underline"
          >
            Forgot password?
          </button>
        </div>
        {showForgot && (
          <motion.p
            id="forgot-help"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/65"
          >
            Ask the academy front desk: an admin can set a new password for you in a minute. You can then change it yourself from{" "}
            <span className="text-white">My dashboard → Account security</span>.
          </motion.p>
        )}
        {formError && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {mode === "admin" ? "Log in as admin" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
