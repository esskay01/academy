import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { academyToday } from "@/lib/membership";

/**
 * Marks members inactive once every membership they have has ended.
 * - Members with no membership recorded yet are left alone.
 * - An upcoming or running membership (end_date >= today) keeps them active.
 * - Admin accounts are exempt so an expired plan can't lock the academy out.
 * Idempotent; safe to call often.
 */
export async function expireEndedMemberships() {
  const today = academyToday();
  const result = await db.execute(sql`
    update "user" u
       set status = 'inactive', status_updated_at = now()
     where u.status = 'active'
       and coalesce(u.role, 'user') <> 'admin'
       and exists (select 1 from memberships m where m.user_id = u.id)
       and not exists (select 1 from memberships m where m.user_id = u.id and m.end_date >= ${today})
  `);
  return result.rowCount ?? 0;
}

export function getMemberships(userId: string) {
  return db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.startDate), desc(memberships.id));
}
