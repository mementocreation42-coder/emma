import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Load through the bold end so font-semibold/bold actually have glyphs to use.
// display:swap paints text immediately in the fallback, then swaps — avoids the
// blank-text delay while the serif loads.
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Emma Kobayashi | Portfolio",
  description: "Visual diary and portfolio of Emma Kobayashi",
  icons: {
    icon: "/favicon-flat.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} antialiased`}
      >
        {/* React hoists this into <head>; video thumbnails/players load directly from Cloudinary */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        {/* Film grain. mix-blend gives it its character; we deliberately avoid
            will-change/filter here — they pinned a full-screen GPU layer and
            re-ran a CSS filter every frame, which was a major scroll cost. */}
        <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.15] mix-blend-overlay" style={{
          backgroundImage: `url('/noise.svg')`,
        }} />
        {children}
      </body>
    </html>
  );
}
