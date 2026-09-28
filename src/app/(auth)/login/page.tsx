import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getSession, isAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect(isAdmin(session) ? "/admin" : "/dashboard");

  const { next } = await props.searchParams;
  // Only allow same-site relative paths to avoid open redirects.
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <>
      <h1 className="font-display text-4xl font-bold text-white">Welcome back</h1>
      <p className="mt-2 text-white/55">Log in to your player or admin account.</p>
      <LoginForm next={nextPath} />
      <p className="mt-8 text-center text-sm text-white/50">
        New to the academy?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
