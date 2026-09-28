import type { ReactNode } from "react";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 text-white/55">{description}</p>}
      </div>
      {children}
    </header>
  );
}
