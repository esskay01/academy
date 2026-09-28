import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Data Access Layer: the single place that decides who may see what.
 * Proxy (src/proxy.ts) only does an optimistic cookie check; every page and
 * Server Action must still call one of these.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Only an *active* admin gets admin powers. */
export function isAdmin(session: { user: { role?: string | null; status?: string | null } } | null) {
  return session?.user.role === "admin" && session.user.status === "active";
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!isAdmin(session)) redirect("/dashboard");
  return session;
}
