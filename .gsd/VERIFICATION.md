## Phase 5 Verification

### Must-Haves
- [x] Users can add comments to tasks. — VERIFIED (`addComment` server action with RBAC + notification creation)
- [x] Threaded replies display with indentation. — VERIFIED (`CommentThread` renders parentId-null comments + nested replies with left border)
- [x] Realtime subscription merges new comments live. — VERIFIED (`subscribeToTaskComments` in useEffect with refetch on change)
- [x] Notification server actions compile with auth enforcement. — VERIFIED (5 actions: getNotifications, getUnreadCount, markAsRead, markAllAsRead, createNotification)
- [x] Bell icon shows realtime unread count. — VERIFIED (`NotificationBell` subscribes via `subscribeToNotifications`, increments count)
- [x] Panel lists notifications with mark-as-read functionality. — VERIFIED (`NotificationPanel` with mark-as-read, mark-all, content-visibility)
- [x] Comments create notifications for task assignees. — VERIFIED (`addComment` creates Notification when assignee ≠ commenter)

### Verdict: PASS
