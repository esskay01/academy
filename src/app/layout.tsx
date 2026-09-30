import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemedToaster } from "@/components/theme/theme-toggle";
import { THEME_COLORS, themeBootScript } from "@/lib/theme";
import "./globals.css";

// Headings: Outfit — clean geometric, sporty. Body: Inter — built for screen legibility.
// `subsets` only picks what is *preloaded*; every subset stays in the CSS with a
// unicode-range, so ₹ and accented names (latin-ext) still load on demand. Preloading
// latin-ext too added ~100 KB to the critical path and slowed the hero's LCP.
const display = Outfit({
  variable: "--font-display-face",
  subsets: ["latin"],
});

const sans = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute URLs for the Open Graph image (the public origin, e.g. https://app.sksap.com).
  metadataBase: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL) : undefined,
  openGraph: { type: "website", siteName: "Bajrang Badminton Academy", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Bajrang Badminton Academy — Where champions take flight",
    template: "%s · Bajrang Badminton Academy",
  },
  description:
    "Professional badminton coaching for kids, adults and competitive players. Certified coaches, pro-grade courts and flexible batches.",
};

export const viewport: Viewport = {
  themeColor: THEME_COLORS.dark,
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by the boot script before hydration, hence suppressHydrationWarning.
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full bg-canvas font-sans text-white selection:bg-brand selection:text-ink">
        <a
          href="#main"
          className="sr-only rounded-xl bg-brand px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
        >
          Skip to content
        </a>
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
