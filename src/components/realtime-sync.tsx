"use client";

import { useTaskRealtime } from "@/hooks/use-task-realtime";

/**
 * Invisible component that subscribes to task realtime events.
 * Placed in the dashboard layout so ALL dashboard pages auto-refresh
 * when any task is created, updated, or status-changed anywhere.
 */
export function RealtimeSync() {
  useTaskRealtime();
  return null; // Renders nothing — pure subscription side-effect
}
