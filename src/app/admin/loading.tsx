/** Skeleton shown inside the admin shell while a page's data loads. */
export default function AdminLoading() {
  return (
    <div aria-busy aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-56 rounded-xl bg-white/[0.07]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded-lg bg-white/[0.05]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="mt-6 h-80 rounded-3xl bg-white/[0.04]" />
    </div>
  );
}
