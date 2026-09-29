import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  announcements,
  coaches,
  programs,
  siteSettings,
  testimonials,
  trainingSlots,
  user,
} from "@/lib/db/schema";
import { shortName } from "@/lib/utils";

// Public website content. `connection()` keeps these reads at request time,
// so admin edits show up immediately and `next build` never needs a database.

export async function getSiteSettings() {
  await connection();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  return row ?? null;
}

export async function getPublicContent() {
  await connection();
  const [settings, coachRows, slotRows, programRows, newsRows, testimonialRows, memberRows] =
    await Promise.all([
      getSiteSettings(),
      db
        .select()
        .from(coaches)
        .where(eq(coaches.isActive, true))
        .orderBy(asc(coaches.sortOrder), asc(coaches.id)),
      db
        .select({ slot: trainingSlots, coachName: coaches.name })
        .from(trainingSlots)
        .leftJoin(coaches, eq(trainingSlots.coachId, coaches.id))
        .where(eq(trainingSlots.isActive, true))
        .orderBy(asc(trainingSlots.sortOrder), asc(trainingSlots.startTime)),
      db
        .select()
        .from(programs)
        .where(eq(programs.isActive, true))
        .orderBy(asc(programs.sortOrder), asc(programs.id)),
      db
        .select()
        .from(announcements)
        .where(eq(announcements.isPublished, true))
        .orderBy(desc(announcements.createdAt))
        .limit(3),
      db
        .select()
        .from(testimonials)
        .where(eq(testimonials.isPublished, true))
        .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt))
        .limit(9),
      // Most recently approved players for the hero avatars. Only public-safe
      // fields leave the server: short name, photo, level, join date.
      db
        .select({ id: user.id, name: user.name, image: user.image, skillLevel: user.skillLevel, createdAt: user.createdAt })
        .from(user)
        .where(and(eq(user.status, "active"), ne(user.role, "admin")))
        .orderBy(sql`${user.statusUpdatedAt} desc nulls last`, desc(user.createdAt))
        .limit(4),
    ]);

  return {
    settings,
    coaches: coachRows,
    slots: slotRows.map((r) => ({ ...r.slot, coachName: r.coachName })),
    programs: programRows,
    announcements: newsRows,
    testimonials: testimonialRows,
    recentMembers: memberRows.map((m) => ({ ...m, name: shortName(m.name) })),
  };
}

export type PublicContent = Awaited<ReturnType<typeof getPublicContent>>;
export type PublicSlot = PublicContent["slots"][number];
export type PublicMember = PublicContent["recentMembers"][number];
