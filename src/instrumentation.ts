// Runs once when the Next.js server starts. Schedules the membership expiry
// sweep so members turn inactive when their plan ends, even if nobody visits
// the site that day. Pages that show status also run the sweep on demand.

const SWEEP_EVERY_MS = 15 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const flag = globalThis as unknown as { __membershipSweep?: NodeJS.Timeout };
  if (flag.__membershipSweep) return; // dev reloads re-run register()

  const { expireEndedMemberships } = await import("@/lib/membership-server");
  const sweep = () =>
    expireEndedMemberships()
      .then((n) => n > 0 && console.log(`[memberships] marked ${n} member(s) inactive`))
      .catch((err) => console.error("[memberships] expiry sweep failed", err));

  void sweep();
  flag.__membershipSweep = setInterval(sweep, SWEEP_EVERY_MS);
  flag.__membershipSweep.unref();
}
