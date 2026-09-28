import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-brand/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-brand/10 aria-invalid:border-rose-400/60";

type FieldProps = {
  label: string;
  /** id of the control this label describes */
  htmlFor: string;
  error?: string | string[];
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** Label + control + error/hint line. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium tracking-wide text-white/60 uppercase">
        {label}
      </label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-xs text-rose-300">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-white/40">{hint}</p>
      ) : null}
    </div>
  );
}

type ControlProps = {
  label: string;
  name: string;
  error?: string | string[];
  hint?: ReactNode;
  fieldClassName?: string;
};

function a11y(id: string, error: ControlProps["error"]) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

export function Input({ id, label, name, error, hint, fieldClassName, className, ...props }: ComponentProps<"input"> & ControlProps) {
  const controlId = id ?? name;
  return (
    <Field label={label} htmlFor={controlId} error={error} hint={hint} className={fieldClassName}>
      <input id={controlId} name={name} {...a11y(controlId, error)} className={cn(inputClass, className)} {...props} />
    </Field>
  );
}

export function Textarea({ id, label, name, error, hint, fieldClassName, className, ...props }: ComponentProps<"textarea"> & ControlProps) {
  const controlId = id ?? name;
  return (
    <Field label={label} htmlFor={controlId} error={error} hint={hint} className={fieldClassName}>
      <textarea id={controlId} name={name} rows={3} {...a11y(controlId, error)} className={cn(inputClass, "resize-y", className)} {...props} />
    </Field>
  );
}

export function Select({
  id,
  label,
  name,
  error,
  hint,
  options,
  fieldClassName,
  className,
  ...props
}: ComponentProps<"select"> & ControlProps & { options: { value: string; label: string }[] }) {
  const controlId = id ?? name;
  return (
    <Field label={label} htmlFor={controlId} error={error} hint={hint} className={fieldClassName}>
      <select
        id={controlId}
        name={name}
        {...a11y(controlId, error)}
        className={cn(
          inputClass,
          "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9 [background-image:var(--chevron)]",
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/80 select-none">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 rounded border-white/20 bg-white/5 accent-brand" />
      {label}
    </label>
  );
}
