"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/lib/validations";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Anyone else holding an old session (another phone, a shared PC) is signed out.
        revokeOtherSessions: true,
      });
      if (error) {
        const wrongCurrent = error.code === "INVALID_PASSWORD";
        if (wrongCurrent) setErrors({ currentPassword: ["That's not your current password"] });
        toast.error(wrongCurrent ? "Your current password is incorrect." : (error.message ?? "Couldn't change your password."));
        return;
      }
      formRef.current?.reset();
      toast.success("Password updated. Other devices were signed out.");
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <PasswordInput id="current-password" label="Current password" name="currentPassword" autoComplete="current-password" error={errors.currentPassword} />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordInput id="new-password" label="New password" name="newPassword" autoComplete="new-password" error={errors.newPassword} showStrength />
        <PasswordInput id="confirm-new-password" label="Confirm new password" name="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Update password
        </Button>
      </div>
    </form>
  );
}
