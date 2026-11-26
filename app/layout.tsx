

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { NotificationProvider } from "@/lib/providers/notification-provider";
import { SidebarProvider } from "@/lib/providers/sidebar-provider";
import { SessionTrackerProvider } from "@/lib/providers/session-tracker-provider";
import { ActivityTrackerProvider } from "@/lib/providers/activity-tracker-provider";
import RouteProgress from "@/components/ui/route-progress";
import LayoutClient from "./layout-client";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-hosted (latin, variable weight): next/font/google downloads fonts during the build, and
// Google's newer font URLs (fonts.gstatic.com/l/font?kit=…&skey=…) fail Next 16.1's font loader
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  weight: "100 900",
  variable: '--font-inter',
});

const plusJakarta = localFont({
  src: "./fonts/PlusJakartaSans-latin.woff2",
  weight: "200 800",
  variable: '--font-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Dastaan Portal - Story Development System",
  description: "Streamlined content management for story development workflow",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <head>
        {/* Preconnect to Supabase project for faster TTFB */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://dbqf.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dbqf.supabase.co" />
      </head>
      <body>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <LayoutClient>
          <QueryProvider>
            <NotificationProvider>
              <SessionTrackerProvider />
              <ActivityTrackerProvider />
              <SidebarProvider>
                {children}
                <Toaster />
              </SidebarProvider>
            </NotificationProvider>
          </QueryProvider>
        </LayoutClient>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

// Client bootstrap moved to `app/layout-client.tsx` to avoid hooks in Server Component
