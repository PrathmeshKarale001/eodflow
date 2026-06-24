import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eodmedia.eodflow',
  appName: 'EOD Flow',
  // webDir is required by Capacitor but unused in Remote URL mode.
  // We point it to 'public' which always exists.
  webDir: 'public',
  server: {
    // ─── REMOTE URL MODE ──────────────────────────────────────────────
    // The native app loads the deployed Next.js server instead of local
    // static files. This preserves all SSR, Server Actions, Prisma DB,
    // Supabase Realtime, and auth flows without any code changes.
    //
    // For LOCAL development, temporarily change this to your LAN IP:
    //   url: 'http://192.168.x.x:3000',
    //
    // For PRODUCTION, set this to your deployed URL:
    url: 'https://flow.eod.media',
    // Allow mixed content during local dev (HTTP on LAN)
    // Set to false for production builds
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0C0C10', // Matches your dark theme --bg
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Dark theme: dark background, light text
      style: 'DARK',           // Light text on dark background
      backgroundColor: '#0C0C10',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // iOS-specific config
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Allow inline media playback (for file previews)
    allowsLinkPreview: true,
  },
  // Android-specific config
  android: {
    // Use Chrome Custom Tabs for external links
    useLegacyBridge: false,
  },
};

export default config;
