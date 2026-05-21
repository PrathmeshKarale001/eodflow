import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientUtilities } from "@/components/client-utilities";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

// ─── PERF: No more `force-dynamic` here! ─────────────────────────────────────
// The Navbar no longer calls auth(), so the root layout can be statically
// optimized. Only dashboard routes (which have their own `force-dynamic`)
// need server-side rendering on every request.
// ──────────────────────────────────────────────────────────────────────────────

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
  icons: {
    icon: "/flowico.ico",
    shortcut: "/flowico.ico",
    apple: "/icon-192.png",
  },
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
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ─── PERF: Resource hints ─────────────────────────────────── */}
        {/* Preconnect to Google Fonts (for Material Symbols WOFF2) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* DNS prefetch for Supabase (API calls from client) */}
        <link rel="dns-prefetch" href="https://supabase.co" />

        {/* ─── PERF: Non-blocking Material Symbols loading ──────────── */}
        {/* Preconnect hints above ensure early connection. The stylesheet
            loads in parallel with HTML parsing. Icons use font-display: swap
            (via our CSS) so text is visible immediately, icons swap in.
            Explicit width/height in globals.css prevents CLS during swap. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased font-body text-on-surface selection:bg-primary-container selection:text-white min-h-screen bg-background`}>
        <ThemeProvider>
          {children}
          <ClientUtilities />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
