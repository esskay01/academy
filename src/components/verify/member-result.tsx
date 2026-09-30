import { BadgeCheck, CalendarRange, Clock, ShieldAlert, ShieldX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { academyToday, membershipProgress, pickCurrentPlan } from "@/lib/membership";
import { getMemberships } from "@/lib/membership-server";
import { capitalize, cn, formatDate } from "@/lib/utils";

export type VerifiedMember = { id: string; name: string; image: string | null; memberCode: string | null; status: string; skillLevel: string };

/** Status verdict + identity + current plan validity. Used by /verify/[token] and the admin desk scanner. */
export async function MemberResult({ member }: { member: VerifiedMember }) {
  const today = academyToday();
  const plan = pickCurrentPlan(await getMemberships(member.id), today);
  const progress = plan ? membershipProgress(plan.startDate, plan.endDate, today) : null;
  const valid = member.status === "active";

  const verdict = valid
    ? { icon: BadgeCheck, title: "Valid member", text: "This card belongs to an active member.", tone: "from-emerald-400/40 text-emerald-300", bg: "bg-emerald-400/10" }
    : member.status === "pending"
      ? { icon: ShieldAlert, title: "Not yet active", text: "This registration is still awaiting approval.", tone: "from-amber-400/40 text-amber-300", bg: "bg-amber-400/10" }
      : { icon: ShieldX, title: "Membership inactive", text: "This member is not currently active. Please check at the front desk.", tone: "from-rose-400/40 text-rose-300", bg: "bg-rose-400/10" };

  return (
    <section className={cn("rounded-[2rem] bg-gradient-to-b to-transparent p-px", verdict.tone)} aria-labelledby="verdict">
      <div className="rounded-[2rem] bg-surface p-7" data-testid="verify-result" data-status={member.status}>
        <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3", verdict.bg)}>
          <verdict.icon className="size-8 shrink-0" />
          <div>
            <h1 id="verdict" className="font-display text-xl font-bold text-white">{verdict.title}</h1>
            <p className="text-sm text-white/65">{verdict.text}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Avatar name={member.name} src={member.image} className="size-20 rounded-2xl text-2xl" />
          <div className="min-w-0">
            <p className="font-display truncate text-2xl font-bold text-white">{member.name}</p>
            <p className="font-mono text-sm text-white/70" data-testid="verify-member-code">{member.memberCode}</p>
            <p className="text-sm text-white/55">{capitalize(member.skillLevel)}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="flex items-center gap-2 text-xs text-white/55"><CalendarRange className="size-3.5" /> Current plan</dt>
            <dd className="mt-1 font-semibold text-white" data-testid="verify-plan">{plan ? plan.programName : "No membership recorded"}</dd>
            {plan && (
              <dd className="mt-0.5 text-white/65">
                Valid {formatDate(plan.startDate)} – <span className="font-semibold text-white" data-testid="verify-valid-until">{formatDate(plan.endDate)}</span>
              </dd>
            )}
          </div>
          {progress && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <dt className="flex items-center gap-2 text-xs text-white/55"><Clock className="size-3.5" /> Validity</dt>
              <dd className="mt-1 font-semibold text-white">
                {progress.phase === "active"
                  ? `${progress.daysLeft} day${progress.daysLeft === 1 ? "" : "s"} left`
                  : progress.phase === "upcoming"
                    ? `Starts in ${progress.daysUntilStart} day${progress.daysUntilStart === 1 ? "" : "s"}`
                    : `Expired on ${formatDate(plan!.endDate)}`}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

export function NotRecognised() {
  return (
    <section className="glass rounded-[2rem] p-8 text-center" data-testid="verify-result" data-status="unknown">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-400/10 text-rose-300">
        <ShieldX className="size-7" />
      </span>
      <h1 className="font-display mt-4 text-2xl font-bold text-white">Card not recognised</h1>
      <p className="mt-2 text-sm text-white/65">
        This card isn&apos;t valid. It may have been replaced by a newer card. Please check with the academy front desk.
      </p>
    </section>
  );
}
