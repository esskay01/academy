import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { SlotManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { coaches, trainingSlots } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Slots" };

export default async function SlotsAdminPage() {
  await requireAdmin();
  const [slots, coachOptions] = await Promise.all([
    db.select().from(trainingSlots).orderBy(asc(trainingSlots.sortOrder), asc(trainingSlots.startTime)),
    db.select({ id: coaches.id, name: coaches.name }).from(coaches).orderBy(asc(coaches.name)),
  ]);
  return (
    <>
      <PageHeader title="Available slots" description="Training batches with timings and live seat availability." />
      <SlotManager slots={slots} coaches={coachOptions} />
    </>
  );
}
