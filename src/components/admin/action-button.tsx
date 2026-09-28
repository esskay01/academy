"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

type Props = {
  /** A Server Action with its arguments already bound. */
  action: () => Promise<ActionState>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  /** Ask for a second click before running (for destructive actions). */
  confirm?: string;
};

export function ActionButton({ action, children, variant = "secondary", size = "sm", confirm }: Props) {
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);

  function run() {
    if (confirm && !armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      const result = await action();
      if (result?.ok) toast.success(result.message);
      else if (result) toast.error(result.message);
    });
  }

  return (
    <Button type="button" variant={armed ? "danger" : variant} size={size} disabled={pending} onClick={run}>
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      {armed ? confirm : children}
    </Button>
  );
}
