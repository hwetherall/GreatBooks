import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://greatbooks.vercel.app"
  ),
  title: "Paradise Lost — Great Books",
  description:
    "Read Paradise Lost by John Milton with contextual enrichment. An AI-powered reading companion that restores what Milton's original audience already knew.",
  openGraph: {
    title: "Paradise Lost — Great Books",
    description:
      "An AI reading companion for serious readers. Contextual enrichment for Paradise Lost calibrated to your knowledge level.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
