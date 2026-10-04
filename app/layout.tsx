import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { KeepMedia, RegisterServiceWorker } from "@/components/pwa";
import { AutoSync } from "@/components/sync";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Learn Spanish",
  description: "The 1,000 most common Spanish words, most common first.",
  applicationName: "Learn Spanish",
  // The manifest is app/manifest.ts; Next links it by itself.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Lets a copy on the iPhone home screen open without Safari's bars.
  appleWebApp: { capable: true, title: "Spanish", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // The paper colour, as in app/globals.css.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="antialiased">
        {children}
        <RegisterServiceWorker />
        <KeepMedia />
        <AutoSync />
      </body>
    </html>
  );
}
