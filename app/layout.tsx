import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { NotificationProvider } from "@/lib/providers/notification-provider";
import { SidebarProvider } from "@/lib/providers/sidebar-provider";
import RouteProgress from "@/components/ui/route-progress";
import LayoutClient from "./layout-client";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Dastaan Portal - Story Development System",
  description: "Streamlined content management for story development workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Supabase project for faster TTFB */}
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
              <SidebarProvider>
                {children}
                <Toaster />
              </SidebarProvider>
            </NotificationProvider>
          </QueryProvider>
        </LayoutClient>
        <Analytics />
      </body>
    </html>
  );
}

// Client bootstrap moved to `app/layout-client.tsx` to avoid hooks in Server Component
