import { cn, initials } from "@/lib/utils";

const gradients = [
  "from-brand to-lime-600",
  "from-cyan-300 to-sky-600",
  "from-ember to-rose-600",
  "from-violet-300 to-violet-600",
  "from-amber-200 to-orange-500",
];

/** Picks a stable gradient per name so initials avatars don't all look alike. */
function gradientFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

/** Photo when available, otherwise the person's initials. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-ink",
        gradientFor(name),
        className,
      )}
    >
      {src ? (
        // Uploaded photos (served from /media) and local previews (blob:) — plain img
        // avoids routing blob: URLs through the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
