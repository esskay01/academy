"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox, Field } from "@/components/ui/field";

type Props = {
  id: string;
  label?: string;
  name?: string;
  currentUrl?: string | null;
  fallbackName: string;
  error?: string | string[];
  /** Show the "Remove current photo" checkbox (default true). */
  allowRemove?: boolean;
};

/** File picker with a live preview; offers "remove" when a photo already exists. */
export function ImageInput({ id, label = "Photo", name = "photo", currentUrl, fallbackName, error, allowRemove = true }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={fallbackName || "?"} src={preview ?? currentUrl} className="size-16 rounded-2xl text-lg" />
        <label
          htmlFor={id}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
        >
          <ImagePlus className="size-4" /> {currentUrl || preview ? "Change photo" : "Upload photo"}
        </label>
        <input
          id={id}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        {currentUrl && allowRemove && <Checkbox label="Remove current photo" name="removePhoto" />}
        <p className="w-full text-xs text-white/40">JPG, PNG or WebP · max 2 MB</p>
      </div>
    </Field>
  );
}
