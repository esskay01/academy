import { ArrowLeft, CheckCircle2, Download, ExternalLink, Printer, RefreshCw, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reissueIdCard } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/dal";
import { getIdCardMember } from "@/lib/id-card";
import { CARD_MM, idCardIssues } from "@/lib/id-card-rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "ID card" };

const requirements = [
  { key: "memberCode", label: "Member ID issued (on approval)" },
  { key: "active", label: "Membership active" },
  { key: "photo", label: "Photo uploaded" },
  { key: "bloodGroup", label: "Blood group recorded" },
] as const;

export default async function IdCardPage(props: PageProps<"/admin/members/[id]/id-card">) {
  await requireAdmin();
  const { id } = await props.params;
  const member = await getIdCardMember(id);
  if (!member) notFound();

  const issues = idCardIssues(member);
  const blocked = new Set(issues.map((i) => i.key));
  const pdfUrl = `/admin/members/${member.id}/id-card/pdf`;

  return (
    <>
      <Link href={`/admin/members/${member.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4" /> Back to {member.name}
      </Link>
      <PageHeader title="Member ID card" description={`${member.name}${member.memberCode ? ` · ${member.memberCode}` : ""}`}>
        <StatusBadge status={member.status} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="glass overflow-hidden rounded-3xl" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="sr-only">Preview</h2>
          {issues.length === 0 ? (
            // The preview is the real PDF that gets printed/downloaded — one source of
            // truth. <object> (not <iframe>) so browsers that can't show PDFs inline,
            // e.g. most phones, show the fallback instead of a blank box.
            <object
              data={`${pdfUrl}#view=FitH&navpanes=0`}
              type="application/pdf"
              aria-label={`ID card preview for ${member.name}`}
              data-testid="id-card-preview"
              className="block h-[34rem] w-full"
            >
              <div className="grid h-[34rem] place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <CheckCircle2 className="size-7" />
                  </span>
                  <p className="mt-4 font-display text-xl font-bold text-white">Card ready</p>
                  <p className="mt-1 text-sm text-white/60">This browser can&apos;t preview PDFs inline. Use Download PDF or Print to see the card.</p>
                </div>
              </div>
            </object>
          ) : (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
                  <XCircle className="size-7" />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-white">This card can&apos;t be printed yet</p>
                <ul className="mt-3 space-y-1 text-sm text-white/60" data-testid="id-card-issues">
                  {issues.map((i) => (
                    <li key={i.key}>{i.label}</li>
                  ))}
                </ul>
                <Link href={`/admin/members/${member.id}`} className={cn(buttonClass("secondary"), "mt-6")}>
                  Fix on the member&apos;s page
                </Link>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="glass rounded-3xl p-6" aria-labelledby="checklist-heading">
            <h2 id="checklist-heading" className="font-display text-lg font-bold text-white">Ready to print?</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {requirements.map((r) => {
                const ok = !blocked.has(r.key);
                return (
                  <li key={r.key} className="flex items-center gap-2.5">
                    {ok ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4 text-rose-300" />}
                    <span className={ok ? "text-white/80" : "text-white"}>{r.label}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              {issues.length === 0 ? (
                <>
                  <a href={`${pdfUrl}?download=1`} download className={buttonClass("primary")}>
                    <Download className="size-4" /> Download PDF
                  </a>
                  <a href={pdfUrl} target="_blank" rel="noopener" className={buttonClass("secondary")}>
                    <Printer className="size-4" /> Print
                  </a>
                </>
              ) : (
                <>
                  <span aria-disabled className={cn(buttonClass("primary"), "pointer-events-none opacity-40")}>
                    <Download className="size-4" /> Download PDF
                  </span>
                  <span aria-disabled className={cn(buttonClass("secondary"), "pointer-events-none opacity-40")}>
                    <Printer className="size-4" /> Print
                  </span>
                </>
              )}
            </div>
          </section>

          {member.verifyToken && (
            <section className="glass rounded-3xl p-6" aria-labelledby="verify-heading">
              <h2 id="verify-heading" className="font-display text-lg font-bold text-white">Verification</h2>
              <p className="mt-1 text-sm text-white/55">The QR code on the back opens this page and shows live status and plan validity.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/verify/${member.verifyToken}`} target="_blank" className={buttonClass("ghost", "sm")}>
                  <ExternalLink className="size-3.5" /> Open verification page
                </Link>
                <ActionButton action={reissueIdCard.bind(null, member.id)} variant="danger" confirm="Old card stops working — confirm">
                  <RefreshCw className="size-3.5" /> Reissue card (lost/stolen)
                </ActionButton>
              </div>
            </section>
          )}

          <section className="glass rounded-3xl p-6 text-sm text-white/65" aria-labelledby="print-heading">
            <h2 id="print-heading" className="font-display text-lg font-bold text-white">Printing on PVC cards</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>
                Card size is CR80 ({CARD_MM.width} × {CARD_MM.height} mm), landscape — pick your card printer (Evolis, Zebra, HID…) and its CR80 card size.
              </li>
              <li>Print at <strong className="text-white">Actual size / 100%</strong> with no margins or &ldquo;fit to page&rdquo;.</li>
              <li>Page 1 is the front, page 2 the back. Use two-sided printing, or print page 1, re-insert the card and print page 2.</li>
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
