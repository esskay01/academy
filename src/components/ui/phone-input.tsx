"use client";

import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  label?: string;
  name?: string;
  defaultValue?: string | null;
  error?: string | string[];
};

/** Mobile number with a fixed +91 prefix; accepts exactly 10 digits. */
export function PhoneInput({ id, label = "Phone", name = "phone", defaultValue, error }: Props) {
  const controlId = id ?? name;
  // Stored values look like "+919876543210"; show only the local 10 digits.
  const digits = (defaultValue ?? "").replace(/\D/g, "").slice(-10);
  return (
    <Field label={label} htmlFor={controlId} error={error}>
      <div className="flex">
        <span className="inline-flex items-center rounded-l-xl border border-r-0 border-white/10 bg-white/[0.08] px-3 text-sm font-semibold text-white/70 select-none">
          +91
        </span>
        <input
          id={controlId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          // No maxLength: it would cut a pasted "98765-43210" by *characters*
          // before the digit filter below runs. The filter caps at 10 digits.
          placeholder="98765 43210"
          defaultValue={digits}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${controlId}-error` : undefined}
          onInput={(e) => {
            // Digits only — strips spaces, dashes and any typed country code characters.
            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 10);
          }}
          className={cn(inputClass, "rounded-l-none tracking-wider")}
        />
      </div>
    </Field>
  );
}
