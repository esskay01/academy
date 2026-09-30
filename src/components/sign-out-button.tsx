"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-label="Sign out"
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
      {/* Icon-only on phones (the aria-label names it); labelled from sm up. */}
      {!compact && <span className="hidden sm:inline">Sign out</span>}
    </Button>
  );
}
