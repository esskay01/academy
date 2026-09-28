import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { AnnouncementManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsAdminPage() {
  await requireAdmin();
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return (
    <>
      <PageHeader title="Announcements" description="The latest three published items appear on the home page." />
      <AnnouncementManager items={rows} />
    </>
  );
}
