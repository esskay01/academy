"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { authClient } from "@/lib/auth-client";
import { SKILL_LEVELS } from "@/lib/constants";
import { capitalize } from "@/lib/utils";
import { registerFormSchema } from "@/lib/validations";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerFormSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});

    const { name, email, password, phone, dateOfBirth, skillLevel } = parsed.data;
    startTransition(async () => {
      const { error } = await authClient.signUp.email({ name, email, password, phone, dateOfBirth, skillLevel });
      if (error) {
        setFormError(error.message ?? "Registration failed. Please try again.");
        return;
      }
      router.replace("/dashboard?welcome=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="glass mt-8 space-y-5 rounded-3xl p-6 sm:p-8">
      <Input label="Full name" name="name" autoComplete="name" placeholder="Saina Sharma" error={errors.name} />
      <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <div className="grid gap-5 sm:grid-cols-2">
        <PhoneInput error={errors.phone} />
        <Input label="Date of birth" name="dateOfBirth" type="date" error={errors.dateOfBirth} />
      </div>
      <Select
        label="Current skill level"
        name="skillLevel"
        defaultValue="beginner"
        error={errors.skillLevel}
        options={SKILL_LEVELS.map((l) => ({ value: l, label: capitalize(l) }))}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordInput label="Password" name="password" autoComplete="new-password" placeholder="Min. 8 characters" error={errors.password} showStrength />
        <PasswordInput label="Confirm password" name="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
      </div>
      {formError && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Create my account
      </Button>
    </form>
  );
}
