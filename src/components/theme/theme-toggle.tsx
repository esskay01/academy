"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import {
  parseTheme,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

// The <html data-theme / data-theme-pref> attributes are the single source of
// truth (set before paint by themeBootScript); components subscribe to them.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-theme-pref"] });
  return () => observer.disconnect();
}

const getPref = () => parseTheme(document.documentElement.dataset.themePref);
const getResolved = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark") as ResolvedTheme;

function setAttributes(pref: ThemePreference, resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
}

/**
 * Switch theme. With an origin point (the clicked button) and View Transitions
 * support, the new theme is revealed as a circle growing from that point;
 * otherwise colours cross-fade. Reduced-motion users get an instant switch.
 */
function applyTheme(pref: ThemePreference, animate: boolean, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const resolved = resolveTheme(pref, matchMedia(LIGHT_QUERY).matches);
  if (resolved === root.dataset.theme || !animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setAttributes(pref, resolved);
    return;
  }
  if (origin && typeof document.startViewTransition === "function") {
    // Element colour transitions would re-animate from the old theme inside the
    // new snapshot (text looks dim mid-reveal), so suspend them for the switch.
    root.classList.add("theme-instant");
    const transition = document.startViewTransition(() => setAttributes(pref, resolved));
    transition.finished.finally(() => root.classList.remove("theme-instant"));
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
          { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
    return;
  }
  root.classList.add("theme-transition");
  window.setTimeout(() => root.classList.remove("theme-transition"), 350);
  setAttributes(pref, resolved);
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getPref, () => "dark" as ThemePreference);
  const resolved = useSyncExternalStore(subscribe, getResolved, () => "dark" as ResolvedTheme);

  const setTheme = useCallback((next: ThemePreference, origin?: { x: number; y: number }) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still applies for this page view.
    }
    applyTheme(next, true, origin);
  }, []);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia(LIGHT_QUERY);
    const onChange = () => applyTheme("system", true);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  return { pref, resolved, setTheme };
}

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Compact segmented Light / Dark / System switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { pref, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-0.5", className)}>
      {options.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${o.label} theme`}
            title={`${o.label} theme`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setTheme(o.value, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            className={cn(
              "grid size-8 place-items-center rounded-[0.6rem] transition",
              active ? "bg-brand text-ink shadow-sm" : "text-white/55 hover:bg-white/5 hover:text-white",
            )}
          >
            <o.icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Sonner toaster that follows the active theme. */
export function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} position="top-center" richColors />;
}
