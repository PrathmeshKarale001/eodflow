/**
 * @deprecated — DO NOT USE
 * 
 * Task realtime notifications are now handled EXCLUSIVELY in ChatProvider.
 * 
 * This hook was the root cause of toast notifications failing on fresh page load:
 * it created a DUPLICATE subscription to "task-notifications" on the same Supabase
 * singleton client, which silently killed ChatProvider's subscription.
 * 
 * See: src/components/chat/chat-provider.tsx (the ONLY place that should subscribe
 * to "task-notifications")
 */
export function useTaskRealtime() {
  // No-op — all functionality moved to ChatProvider
}
