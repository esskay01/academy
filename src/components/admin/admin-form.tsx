"use client";

import { Loader2, Save } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState, FieldErrors } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: (errors: FieldErrors) => ReactNode;
  submitLabel?: string;
  /** Clear the form after a successful create. */
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  className?: string;
  footer?: ReactNode;
};

export function AdminForm({ action, children, submitLabel = "Save changes", resetOnSuccess, onSuccess, className, footer }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    } else {
      toast.error(state.message);
    }
    // Only react to a new result, not to callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      noValidate
      // Submit via onSubmit instead of `action` so React doesn't auto-reset the
      // form — admins keep their input when validation fails.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className={cn("space-y-5", className)}
    >
      {children(state?.errors ?? {})}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {footer}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
