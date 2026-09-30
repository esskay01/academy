"use client";

import { updateMyPhoto } from "./actions";
import { AdminForm } from "@/components/admin/admin-form";
import { ImageInput } from "@/components/ui/image-input";

export function PhotoForm({ name, image }: { name: string; image: string | null }) {
  return (
    <AdminForm action={updateMyPhoto} submitLabel="Save photo" resetOnSuccess>
      {(e) => <ImageInput id="my-photo" label="Your photo" currentUrl={image} fallbackName={name} error={e.photo} allowRemove={false} />}
    </AdminForm>
  );
}
