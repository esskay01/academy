/** Theme preference shared by the no-flash boot script and the client toggle. */
export const THEMES = ["dark", "light", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME: ThemePreference = "dark";
export const THEME_COLORS: Record<ResolvedTheme, string> = { dark: "#05070f", light: "#f4f6f0" };

export function resolveTheme(pref: ThemePreference, systemPrefersLight: boolean): ResolvedTheme {
  if (pref === "system") return systemPrefersLight ? "light" : "dark";
  return pref;
}

export function parseTheme(raw: unknown): ThemePreference {
  return (THEMES as readonly unknown[]).includes(raw) ? (raw as ThemePreference) : DEFAULT_THEME;
}

/**
 * Inline <head> script: applies the stored theme before first paint so there is
 * no flash of the wrong theme. Kept tiny and dependency-free on purpose.
 */
export const themeBootScript = `(function(){var d=document.documentElement,t="${DEFAULT_THEME}";try{t=localStorage.getItem("${THEME_STORAGE_KEY}")||t}catch(e){}var l=t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches);d.dataset.theme=l?"light":"dark";d.dataset.themePref=t})()`;
