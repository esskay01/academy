import { eq } from "drizzle-orm";
import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { inputClass } from "@/components/ui/field";
import { MemberResult, NotRecognised } from "@/components/verify/member-result";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { parseScan } from "@/lib/id-card-rules";
import { expireEndedMemberships } from "@/lib/membership-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify card" };

/**
 * Front-desk check-in: a USB/Bluetooth barcode scanner "types" the card's
 * Code 128 (member ID) — or the QR URL — into the box and presses Enter. The
 * result shows below and the box is focused again for the next card.
 */
export default async function VerifyCardPage(props: PageProps<"/admin/verify">) {
  await requireAdmin();
  await expireEndedMemberships();
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const scan = query ? parseScan(query) : null;

  const columns = { id: user.id, name: user.name, image: user.image, memberCode: user.memberCode, status: user.status, skillLevel: user.skillLevel };
  const [member] = scan
    ? await db
        .select(columns)
        .from(user)
        .where(scan.kind === "code" ? eq(user.memberCode, scan.code) : eq(user.verifyToken, scan.token))
    : [];

  return (
    <>
      <PageHeader title="Verify card" description="Scan a member ID card's barcode (or QR code), or type a member ID." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action="/admin/verify" className="glass h-fit rounded-3xl p-6">
          <label htmlFor="q" className="text-xs font-medium tracking-wide text-white/60 uppercase">Member ID or card scan</label>
          <div className="relative mt-1.5">
            <ScanLine className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            {/* key forces a fresh, empty, focused input after every scan */}
            <input
              key={query}
              id="q"
              name="q"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="BBA-2026-00001"
              className={cn(inputClass, "pl-10 font-mono text-base tracking-wider")}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">Scanners send Enter automatically. You can also type the ID and press Enter.</p>
          {query && !scan && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              &ldquo;{query}&rdquo; isn&apos;t a member ID or card code.
            </p>
          )}
        </form>
        <div>
          {scan && (member ? <MemberResult member={member} /> : <NotRecognised />)}
          {!query && (
            <div className="glass grid min-h-64 place-items-center rounded-3xl p-8 text-center text-sm text-white/55">
              <div>
                <ScanLine className="mx-auto size-10 text-brand-text" />
                <p className="mt-3">Waiting for a scan…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
