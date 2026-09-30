"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { deleteImage, readImage, saveImage } from "@/lib/media";

/** A signed-in member uploads or replaces their own photo (only ever their own row). */
export async function updateMyPhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const photo = await readImage(formData, "photo");
  if (!photo) return { ok: false, message: "Choose a photo first.", errors: { photo: ["Choose a photo"] } };
  if (!photo.ok) return { ok: false, message: photo.error, errors: { photo: [photo.error] } };

  const [current] = await db.select({ image: user.image }).from(user).where(eq(user.id, session.user.id));
  const image = await saveImage(photo);
  await db.update(user).set({ image }).where(eq(user.id, session.user.id));
  await deleteImage(current?.image);
  revalidatePath("/", "layout");
  return { ok: true, message: "Your photo was updated." };
}
