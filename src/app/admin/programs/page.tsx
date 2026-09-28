import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { ProgramManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Programs & fees" };

export default async function ProgramsAdminPage() {
  await requireAdmin();
  const rows = await db.select().from(programs).orderBy(asc(programs.sortOrder), asc(programs.id));
  return (
    <>
      <PageHeader title="Programs & fees" description="Membership plans shown in the pricing section." />
      <ProgramManager programs={rows} />
    </>
  );
}
