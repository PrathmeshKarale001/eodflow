"use client";

import dynamic from "next/dynamic";

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
 * Lazy-loaded to keep the initial JS bundle small.
 */
export function ClientUtilities() {
  return (
    <>
      <PWAInstallPrompt />
      <PushNotificationManager />
    </>
  );
}
