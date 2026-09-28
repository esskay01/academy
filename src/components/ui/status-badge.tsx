import type { UserStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const styles: Record<UserStatus, { label: string; className: string; dot: string }> = {
  active: {
    label: "Active",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400",
  },
  pending: {
    label: "Pending approval",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    dot: "bg-amber-400 animate-pulse",
  },
  inactive: {
    label: "Inactive",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = styles[(status as UserStatus) in styles ? (status as UserStatus) : "inactive"];
  return (
    <span
      data-testid="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        s.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function RoleBadge({ role }: { role?: string | null }) {
  if (role !== "admin") return null;
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
      Admin
    </span>
  );
}
