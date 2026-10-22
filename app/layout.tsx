import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { KeepMedia, RegisterServiceWorker } from "@/components/pwa";
import { LANG } from "@/lang";
import { AutoSync } from "@/components/sync";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: LANG.appName,
  description: LANG.description,
  applicationName: LANG.appName,
  // The manifest is app/manifest.ts; Next links it by itself.
  icons: {
    icon: [
      { url: LANG.icons.icon192, sizes: "192x192", type: "image/png" },
      { url: LANG.icons.icon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: LANG.icons.apple, sizes: "180x180", type: "image/png" }],
  },
  // Lets a copy on the iPhone home screen open without Safari's bars.
  appleWebApp: { capable: true, title: LANG.shortName, statusBarStyle: "default" },
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
