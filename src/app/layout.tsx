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

// Load through the bold end so font-semibold/bold actually have glyphs to use
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.15] mix-blend-overlay will-change-transform" style={{
          backgroundImage: `url('/noise.svg')`,
          filter: 'contrast(120%) brightness(120%)',
          transform: 'translateZ(0)' // Force GPU layer
        }} />
        {children}
      </body>
    </html>
  );
}
