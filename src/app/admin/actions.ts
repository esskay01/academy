"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  announcements,
  coaches,
  memberships,
  programs,
  siteSettings,
  testimonials,
  trainingSlots,
  user,
  type UserStatus,
} from "@/lib/db/schema";
import { deleteImage, readImage, saveImage } from "@/lib/media";
import { academyToday, computeEndDate } from "@/lib/membership";
import { formatDate } from "@/lib/utils";
import { expireEndedMemberships, getMemberships } from "@/lib/membership-server";
import {
  announcementSchema,
  coachSchema,
  createAdminSchema,
  idSchema,
  memberEditSchema,
  membershipSchema,
  programSchema,
  promoteByEmailSchema,
  settingsSchema,
  slotSchema,
  testimonialSchema,
} from "@/lib/validations";

// Every action starts with `requireAdmin()` — Server Actions are public HTTP
// endpoints, so the check must live here and not only in the admin layout.

const userIdSchema = z.string().min(1).max(100);

function invalid(error: z.ZodError): ActionState {
  return { ok: false, message: "Please fix the highlighted fields.", errors: z.flattenError(error).fieldErrors };
}

function refreshSite() {
  revalidatePath("/", "layout");
}

function formToObject(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")),
  );
}

function optionalId(formData: FormData) {
  const raw = formData.get("id");
  return raw ? idSchema.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

async function setStatus(rawUserId: string, status: UserStatus, success: string): Promise<ActionState> {
  const session = await requireAdmin();
  const userId = userIdSchema.parse(rawUserId);
  if (userId === session.user.id && status !== "active") {
    return { ok: false, message: "You can't deactivate your own account." };
  }
  const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  if (!target) return { ok: false, message: "Member not found." };
  if (status === "active" && target.role !== "admin") {
    // Otherwise the expiry sweep would flip them straight back to inactive.
    const history = await getMemberships(userId);
    if (history.length > 0 && !history.some((m) => m.endDate >= academyToday())) {
      return { ok: false, message: "Their membership has ended — record a new membership first (Edit → Memberships)." };
    }
  }
  // An inactive account must not keep admin powers (Better Auth's own
  // /api/auth/admin/* endpoints only look at the role), so demote as well.
  const revokeAdmin = status !== "active" && target.role === "admin";
  const [updated] = await db
    .update(user)
    .set({ status, statusUpdatedAt: new Date(), ...(revokeAdmin && { role: "user" }) })
    .where(eq(user.id, userId))
    .returning({ name: user.name });
  refreshSite();
  return { ok: true, message: `${updated.name} ${success}${revokeAdmin ? " Admin access was removed." : ""}` };
}

export async function approveUser(userId: string) {
  return setStatus(userId, "active", "is now an active member.");
}

export async function rejectUser(userId: string) {
  return setStatus(userId, "inactive", "was rejected and marked inactive.");
}

export async function activateUser(userId: string) {
  return setStatus(userId, "active", "is active again.");
}

export async function deactivateUser(userId: string) {
  return setStatus(userId, "inactive", "was marked inactive.");
}

export async function setAdminRole(rawUserId: string, rawMakeAdmin: boolean): Promise<ActionState> {
  const session = await requireAdmin();
  const userId = userIdSchema.parse(rawUserId);
  const makeAdmin = z.boolean().parse(rawMakeAdmin);
  if (userId === session.user.id && !makeAdmin) {
    return { ok: false, message: "You can't remove your own admin access." };
  }
  await auth.api.setRole({
    body: { userId, role: makeAdmin ? "admin" : "user" },
    headers: await headers(),
  });
  // An admin must be able to use the panel, so promotion also activates.
  if (makeAdmin) {
    await db.update(user).set({ status: "active", statusUpdatedAt: new Date() }).where(eq(user.id, userId));
  }
  refreshSite();
  return { ok: true, message: makeAdmin ? "Admin access granted." : "Admin access removed." };
}

export async function updateMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = userIdSchema.parse(formData.get("userId"));
  const parsed = memberEditSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { removePhoto, ...fields } = parsed.data;

  const [current] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId));
  if (!current) return { ok: false, message: "Member not found." };

  const [emailOwner] = await db.select({ id: user.id }).from(user).where(eq(user.email, fields.email));
  if (emailOwner && emailOwner.id !== userId) {
    return { ok: false, message: "Another account already uses that email.", errors: { email: ["Already in use"] } };
  }

  const photo = await readImage(formData, "photo");
  if (photo && !photo.ok) return { ok: false, message: photo.error, errors: { photo: [photo.error] } };

  let image = current.image;
  if (photo?.ok || removePhoto) {
    await deleteImage(current.image);
    image = photo?.ok ? await saveImage(photo) : null;
  }

  await db.update(user).set({ ...fields, image }).where(eq(user.id, userId));
  refreshSite();
  return { ok: true, message: `${fields.name}'s details were saved.` };
}

export async function saveMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = userIdSchema.parse(formData.get("userId"));
  const parsed = membershipSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { programId, ...fields } = parsed.data;

  const [program] = await db.select({ name: programs.name }).from(programs).where(eq(programs.id, programId));
  if (!program) return { ok: false, message: "That program no longer exists.", errors: { programId: ["Not found"] } };
  const [member] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!member) return { ok: false, message: "Member not found." };

  // End date is always computed here — any client-sent value is ignored.
  const row = {
    ...fields,
    programId,
    programName: program.name,
    endDate: computeEndDate(fields.startDate, fields.durationMonths, fields.durationDays),
  };
  const id = optionalId(formData);
  if (id) {
    const [updated] = await db
      .update(memberships)
      .set(row)
      .where(and(eq(memberships.id, id), eq(memberships.userId, userId)))
      .returning({ id: memberships.id });
    if (!updated) return { ok: false, message: "Membership not found." };
  } else {
    await db.insert(memberships).values({ ...row, userId });
  }
  // Membership drives status: a running or upcoming plan re-activates a member
  // who went inactive (e.g. their previous plan ended). Pending sign-ups still
  // need approval, so they're left alone.
  let reactivated = false;
  if (row.endDate >= academyToday()) {
    const back = await db
      .update(user)
      .set({ status: "active", statusUpdatedAt: new Date() })
      .where(and(eq(user.id, userId), eq(user.status, "inactive")))
      .returning({ id: user.id });
    reactivated = back.length > 0;
  }
  const expired = await expireEndedMemberships();
  refreshSite();
  return {
    ok: true,
    message: `Membership ${id ? "updated" : "recorded"} — ends ${formatDate(row.endDate)}.${expired ? " Member is now inactive (membership completed)." : reactivated ? " Member is active again." : ""}`,
  };
}

export async function deleteMembership(id: number): Promise<ActionState> {
  await requireAdmin();
  await db.delete(memberships).where(eq(memberships.id, idSchema.parse(id)));
  refreshSite();
  return { ok: true, message: "Membership record deleted." };
}

/** Permanently removes an inactive member (sessions/accounts cascade). */
export async function deleteMember(rawUserId: string): Promise<ActionState> {
  const session = await requireAdmin();
  const userId = userIdSchema.parse(rawUserId);
  if (userId === session.user.id) return { ok: false, message: "You can't delete your own account." };

  const [target] = await db.select({ name: user.name, status: user.status, image: user.image }).from(user).where(eq(user.id, userId));
  if (!target) return { ok: false, message: "Member not found." };
  if (target.status !== "inactive") {
    return { ok: false, message: "Only inactive members can be deleted. Mark them inactive first." };
  }
  await db.delete(user).where(eq(user.id, userId));
  await deleteImage(target.image);
  refreshSite();
  return { ok: true, message: `${target.name} was deleted permanently.` };
}

export async function promoteByEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = promoteByEmailSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, parsed.data.email.toLowerCase()));
  if (!target) return { ok: false, message: "No registered user with that email.", errors: { email: ["Not found"] } };
  if (target.role === "admin") return { ok: false, message: "That user is already an admin." };
  return setAdminRole(target.id, true);
}

export async function createAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = createAdminSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password, phone } = parsed.data;

  try {
    const created = await auth.api.createUser({
      body: { name, email, password, role: "admin", data: { phone, skillLevel: "professional" } },
      headers: await headers(),
    });
    await db
      .update(user)
      .set({ status: "active", statusUpdatedAt: new Date() })
      .where(eq(user.id, created.user.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't create the admin.";
    return { ok: false, message };
  }
  refreshSite();
  return { ok: true, message: `${name} can now log in as an admin.` };
}

// ---------------------------------------------------------------------------
// Website content
// ---------------------------------------------------------------------------

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await db
    .insert(siteSettings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: siteSettings.id, set: parsed.data });
  refreshSite();
  return { ok: true, message: "Website information updated." };
}

export async function saveCoach(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = coachSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId(formData);
  if (id) await db.update(coaches).set(parsed.data).where(eq(coaches.id, id));
  else await db.insert(coaches).values(parsed.data);
  refreshSite();
  return { ok: true, message: id ? "Coach updated." : "Coach added." };
}

export async function deleteCoach(id: number): Promise<ActionState> {
  await requireAdmin();
  await db.delete(coaches).where(eq(coaches.id, idSchema.parse(id)));
  refreshSite();
  return { ok: true, message: "Coach removed." };
}

export async function saveSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = slotSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId(formData);
  if (id) await db.update(trainingSlots).set(parsed.data).where(eq(trainingSlots.id, id));
  else await db.insert(trainingSlots).values(parsed.data);
  refreshSite();
  return { ok: true, message: id ? "Slot updated." : "Slot added." };
}

export async function deleteSlot(id: number): Promise<ActionState> {
  await requireAdmin();
  await db.delete(trainingSlots).where(eq(trainingSlots.id, idSchema.parse(id)));
  refreshSite();
  return { ok: true, message: "Slot removed." };
}

export async function saveProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = programSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId(formData);
  if (id) await db.update(programs).set(parsed.data).where(eq(programs.id, id));
  else await db.insert(programs).values(parsed.data);
  refreshSite();
  return { ok: true, message: id ? "Program updated." : "Program added." };
}

export async function deleteProgram(id: number): Promise<ActionState> {
  await requireAdmin();
  await db.delete(programs).where(eq(programs.id, idSchema.parse(id)));
  refreshSite();
  return { ok: true, message: "Program removed." };
}

export async function saveAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = announcementSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId(formData);
  if (id) await db.update(announcements).set(parsed.data).where(eq(announcements.id, id));
  else await db.insert(announcements).values(parsed.data);
  refreshSite();
  return { ok: true, message: id ? "Announcement updated." : "Announcement published." };
}

export async function saveTestimonial(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = testimonialSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { removePhoto, ...fields } = parsed.data;
  const id = optionalId(formData);

  const photo = await readImage(formData, "photo");
  if (photo && !photo.ok) return { ok: false, message: photo.error, errors: { photo: [photo.error] } };

  if (id) {
    const [current] = await db.select({ photoUrl: testimonials.photoUrl }).from(testimonials).where(eq(testimonials.id, id));
    if (!current) return { ok: false, message: "Testimonial not found." };
    let photoUrl = current.photoUrl;
    if (photo?.ok || removePhoto) {
      await deleteImage(current.photoUrl);
      photoUrl = photo?.ok ? await saveImage(photo) : null;
    }
    await db.update(testimonials).set({ ...fields, photoUrl }).where(eq(testimonials.id, id));
  } else {
    const photoUrl = photo?.ok ? await saveImage(photo) : null;
    await db.insert(testimonials).values({ ...fields, photoUrl });
  }
  refreshSite();
  return { ok: true, message: id ? "Testimonial updated." : "Testimonial added." };
}

export async function deleteTestimonial(id: number): Promise<ActionState> {
  await requireAdmin();
  const [row] = await db.delete(testimonials).where(eq(testimonials.id, idSchema.parse(id))).returning({ photoUrl: testimonials.photoUrl });
  await deleteImage(row?.photoUrl);
  refreshSite();
  return { ok: true, message: "Testimonial deleted." };
}

export async function deleteAnnouncement(id: number): Promise<ActionState> {
  await requireAdmin();
  await db.delete(announcements).where(eq(announcements.id, idSchema.parse(id)));
  refreshSite();
  return { ok: true, message: "Announcement deleted." };
}
