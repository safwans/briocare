import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DevBar from "@/components/DevBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrioCare",
  description: "Clinician console — pediatric group therapy co-pilot (MVP)",
};

// DevBar reads clinicians and patients from the database on every render, so any page carrying it
// has to be rendered per-request. Without this the landing page is statically prerendered and the
// build fails trying to reach a database that doesn't exist inside the container image.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Always on in dev. SHOW_DEV_BAR=1 opts a deployed environment in — it's the only navigation
  // between the therapist / patient / admin surfaces, so a demo deployment needs it. Default stays
  // off so a real production build never ships the identity switcher.
  const showDevBar = process.env.NODE_ENV !== "production" || process.env.SHOW_DEV_BAR === "1";
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {showDevBar && <DevBar />}
        {children}
      </body>
    </html>
  );
}
