"use client";

import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";

// ─── PERF: Lazy-load non-critical client components ──────────────────────────
// PWA prompt and push notifications are never needed on initial render.
// PWA shows after beforeinstallprompt event, push shows after 10s delay.
// Wrapping in a client component because `ssr: false` is only allowed in
// Client Components (not Server Components like layout.tsx).

const PWAInstallPrompt = dynamic(
  () => import("@/components/pwa/pwa-install-prompt").then((m) => m.PWAInstallPrompt),
  { ssr: false }
);

const PushNotificationManager = dynamic(
  () => import("@/components/push/push-notification-manager").then((m) => m.PushNotificationManager),
  { ssr: false }
);

/**
 * Client-side utilities that don't need SSR.
 * Toaster is here to guarantee it renders in a client component context.
 * Lazy-loaded to keep the initial JS bundle small.
 */
export function ClientUtilities() {
  return (
    <>
      <PWAInstallPrompt />
      <PushNotificationManager />
      <Toaster
        position="bottom-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#e0e0e0',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
          },
          success: {
            iconTheme: { primary: '#00FF41', secondary: '#0a0a0a' },
          },
          error: {
            iconTheme: { primary: '#ff4444', secondary: '#0a0a0a' },
            duration: 5000,
          },
        }}
      />
    </>
  );
}
