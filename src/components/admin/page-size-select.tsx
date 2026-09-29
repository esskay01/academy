"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAGE_SIZES } from "@/lib/validations";

export function PageSizeSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-xs text-white/55">
      Rows per page
      <select
        aria-label="Rows per page"
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams);
          params.set("size", e.target.value);
          params.delete("page"); // back to the first page for the new size
          router.push(`${pathname}?${params}`);
        }}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-brand/60"
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n} className="bg-surface">
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
