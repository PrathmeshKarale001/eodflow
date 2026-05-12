# Phase 5 Research: Communication Layer & Realtime Sync

## Key Findings from Web Research

### Supabase Realtime + Next.js Best Practices (supabase.com/docs)
- Use **client components** for realtime subscriptions (Server Components can't hold WebSocket connections)
- Server-fetch initial data in a Server Component, then pass to a client child that subscribes to realtime
- Pattern: Server fetches → Client renders + subscribes → postgres_changes merges updates
- Clean up channels in `useEffect` return to prevent memory leaks

### Optimistic Updates (React 19 useOptimistic)
- Use `useOptimistic` hook for instant UI feedback on comment/notification actions
- Combine with `startTransition` for server actions that revalidate paths
- Fallback: local state update on submit, then refresh from server

### Architecture Decisions
1. **Comments**: Server actions for CRUD, client component for thread UI with realtime subscription
2. **Notifications**: Server-side creation (triggered by other actions), client-side bell with realtime subscription
3. **No WebSocket server needed** — Supabase Realtime handles all pub/sub

## Existing Codebase Assets
- `src/lib/realtime.ts`: Already has `subscribeToTaskComments`, `subscribeToNotifications`, `trackPresence`, `broadcastTyping`
- `prisma/schema.prisma`: Comment model (threaded, with annotations), Notification model (typed, with deep links)
- `permissions.ts`: `addComment`, `deleteAnyComment`, `deleteOwnComment` already defined
