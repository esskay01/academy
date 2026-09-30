import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MemberResult, NotRecognised } from "@/components/verify/member-result";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { expireEndedMemberships } from "@/lib/membership-server";

// Reached by scanning the QR code on a member ID card. Public, but only via the
// card's unguessable token, and it shows just what a check needs (no contact
// details or date of birth). Never indexed.
export const metadata: Metadata = {
  title: "Verify member card",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const TOKEN = /^[0-9a-f]{32}$/;

export default async function VerifyPage(props: PageProps<"/verify/[token]">) {
  await connection();
  const { token } = await props.params;
  // Settle expiries first so the status shown is live.
  await expireEndedMemberships();

  const [member] = TOKEN.test(token)
    ? await db
        .select({ id: user.id, name: user.name, image: user.image, memberCode: user.memberCode, status: user.status, skillLevel: user.skillLevel })
        .from(user)
        .where(eq(user.verifyToken, token))
    : [];

  const checkedAt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date());

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-clip px-4 py-10">
      <div aria-hidden className="court-grid absolute inset-0 opacity-40" />
      <ThemeToggle className="absolute top-4 right-4 z-10" />
      <main id="main" className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {member ? <MemberResult member={member} /> : <NotRecognised />}
        <p className="mt-5 text-center text-xs text-white/50">Checked {checkedAt} IST</p>
      </main>
    </div>
  );
}
