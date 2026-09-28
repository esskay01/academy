import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bajrang Badminton Academy — Where champions take flight",
    template: "%s · Bajrang Badminton Academy",
  },
  description:
    "Professional badminton coaching for kids, adults and competitive players. Certified coaches, pro-grade courts and flexible batches.",
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-ink font-sans text-white selection:bg-brand selection:text-ink">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
