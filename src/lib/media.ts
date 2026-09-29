import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MEDIA_PREFIX = "/media/";

/** Identify the image type from its first bytes — never trust the client's MIME type. */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

type ImageResult = { ok: true; data: Buffer; contentType: string } | { ok: false; error: string } | null;

/** Reads an optional image upload from a form. `null` means no file was chosen. */
export async function readImage(formData: FormData, field: string): Promise<ImageResult> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Image must be 2 MB or smaller." };
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(data);
  if (!contentType) return { ok: false, error: "Use a JPG, PNG or WebP image." };
  return { ok: true, data, contentType };
}

/** Stores the image and returns its public URL. */
export async function saveImage(image: { data: Buffer; contentType: string }) {
  const id = randomUUID();
  await db.insert(media).values({ id, data: image.data, contentType: image.contentType });
  return `${MEDIA_PREFIX}${id}`;
}

/** Deletes an image previously returned by `saveImage` (ignores external URLs). */
export async function deleteImage(url: string | null | undefined) {
  if (!url?.startsWith(MEDIA_PREFIX)) return;
  await db.delete(media).where(eq(media.id, url.slice(MEDIA_PREFIX.length)));
}
