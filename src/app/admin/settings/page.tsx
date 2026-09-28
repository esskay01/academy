import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/forms";
import { PageHeader } from "@/components/admin/page-header";
import { getSiteSettings } from "@/lib/content";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Site & contact" };

export default async function SettingsAdminPage() {
  await requireAdmin();
  const settings = await getSiteSettings();
  return (
    <>
      <PageHeader title="Site & contact info" description="Hero text, about section, contact details and headline numbers." />
      <section className="glass rounded-3xl p-6 sm:p-8">
        <SettingsForm settings={settings} />
      </section>
    </>
  );
}
