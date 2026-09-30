import { ShuttleIcon } from "@/components/brand/logo";

export default function DashboardLoading() {
  return (
    <div aria-busy aria-live="polite" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 text-white/50">
        <ShuttleIcon className="animate-float size-12" />
        <p className="text-sm">Loading your dashboard…</p>
      </div>
    </div>
  );
}
