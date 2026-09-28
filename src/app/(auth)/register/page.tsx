import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { getSession } from "@/lib/dal";

export const metadata: Metadata = { title: "Join the academy" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <>
      <h1 className="font-display text-4xl font-bold text-white">Join the academy</h1>
      <p className="mt-2 text-white/55">
        Create your player account. An admin will review and activate it — usually within a day.
      </p>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-white/50">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
