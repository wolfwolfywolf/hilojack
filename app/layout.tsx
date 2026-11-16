import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PendingUI } from "@/components/PendingUI";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "High Low Jack League",
  description: "Standings and schedule",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Hi Lo Jack", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d3d24" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PendingUI stamp={Date.now()} />
        {children}
      </body>
    </html>
  );
}
