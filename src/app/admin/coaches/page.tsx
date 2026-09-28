import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { CoachManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { coaches } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Coaches" };

export default async function CoachesAdminPage() {
  await requireAdmin();
  const rows = await db.select().from(coaches).orderBy(asc(coaches.sortOrder), asc(coaches.id));
  return (
    <>
      <PageHeader title="Coaches" description="Shown in the “Our coaches” section of the website." />
      <CoachManager coaches={rows} />
    </>
  );
}
