import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { TestimonialManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { testimonials } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsAdminPage() {
  await requireAdmin();
  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
  return (
    <>
      <PageHeader title="Testimonials" description="Published testimonials (with photos) appear on the home page." />
      <TestimonialManager items={rows} />
    </>
  );
}
