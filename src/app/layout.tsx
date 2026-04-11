import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PushNotificationManager } from "@/components/push/push-notification-manager";
import "@/styles/globals.css";

// Navbar calls auth() which uses Next.js headers() — the entire app must be dynamic
export const dynamic = "force-dynamic";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});


export const metadata: Metadata = {
  title: {
    default: "EOD Flow",
    template: "%s | EOD Flow",
  },
  description: "Internal Task Management System — End Of Day Media",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EOD Flow",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols — loaded non-blocking (not render-blocking @import) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased font-body text-on-surface selection:bg-primary-container selection:text-white min-h-screen overflow-x-hidden bg-background`}>
        <ThemeProvider>
          <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-4 min-h-screen relative z-0">
            <Navbar />
            <main className="flex-1 flex flex-col relative z-10 w-full">
              {children}
            </main>
          </div>
          <PWAInstallPrompt />
          <PushNotificationManager />
        </ThemeProvider>
      </body>
    </html>
  );
}

