import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  announcements,
  coaches,
  programs,
  siteSettings,
  trainingSlots,
} from "@/lib/db/schema";

// Public website content. `connection()` keeps these reads at request time,
// so admin edits show up immediately and `next build` never needs a database.

export async function getSiteSettings() {
  await connection();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  return row ?? null;
}

export async function getPublicContent() {
  await connection();
  const [settings, coachRows, slotRows, programRows, newsRows] =
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
    ]);

  return {
    settings,
    coaches: coachRows,
    slots: slotRows.map((r) => ({ ...r.slot, coachName: r.coachName })),
    programs: programRows,
    announcements: newsRows,
  };
}

export type PublicContent = Awaited<ReturnType<typeof getPublicContent>>;
export type PublicSlot = PublicContent["slots"][number];
