"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { passwordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "type"> & {
  label: string;
  name: string;
  error?: string | string[];
  hint?: ReactNode;
  fieldClassName?: string;
  /** Show a live strength meter under the field (sign-up / new passwords). */
  showStrength?: boolean;
};

const meterColors = ["", "bg-rose-400", "bg-amber-400", "bg-lime-300", "bg-emerald-400"];

/** Password field with a show/hide toggle, a Caps Lock warning and an optional strength meter. */
export function PasswordInput({ id, label, name, error, hint, fieldClassName, className, showStrength, onChange, onKeyUp, ...props }: Props) {
  const controlId = id ?? name;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [value, setValue] = useState("");
  const strength = passwordStrength(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // A form reset (e.g. after a successful save) clears the input without a change event.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setValue("");
      setVisible(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  const extraHint = capsLock ? (
    <span className="text-amber-300">Caps Lock is on</span>
  ) : showStrength && value ? (
    <span data-testid="password-strength">
      Strength: <span className="font-semibold text-white/70">{strength.label}</span>
    </span>
  ) : (
    hint
  );

  return (
    <Field label={label} htmlFor={controlId} error={error} hint={extraHint} className={fieldClassName}>
      <div className="relative">
        <input
          ref={inputRef}
          id={controlId}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${controlId}-error` : undefined}
          className={cn(inputClass, "pr-11", className)}
          onChange={(e) => {
            if (showStrength) setValue(e.currentTarget.value);
            onChange?.(e);
          }}
          onKeyUp={(e) => {
            checkCaps(e);
            onKeyUp?.(e);
          }}
          onKeyDown={checkCaps}
          onBlur={() => setCapsLock(false)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={controlId}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-white/40 transition hover:text-white focus-visible:text-brand-text focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && (
        <div aria-hidden className="grid grid-cols-4 gap-1 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("h-1 rounded-full transition-colors duration-300", strength.score >= i ? meterColors[strength.score] : "bg-white/10")}
            />
          ))}
        </div>
      )}
    </Field>
  );
}
