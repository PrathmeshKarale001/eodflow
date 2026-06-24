/**
 * Capacitor Platform Detection Utilities
 *
 * These helpers allow feature code to branch between web and native
 * without importing the full Capacitor bundle in the browser.
 * All checks are safe to call on the server (they return false / 'web').
 */

/**
 * Returns true when running inside a Capacitor native shell (iOS or Android).
 * Returns false in a regular browser, during SSR, or in a PWA.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor injects this global when running inside a native WebView
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Returns the current platform: 'ios', 'android', or 'web'.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return 'web';
  return cap.getPlatform?.() ?? 'web';
}

/**
 * Returns true when running on iOS inside Capacitor.
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * Returns true when running on Android inside Capacitor.
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
