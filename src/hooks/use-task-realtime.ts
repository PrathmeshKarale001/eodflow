"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/realtime";

/**
 * Global hook that subscribes to Supabase Broadcast channel "task-notifications"
 * and triggers router.refresh() whenever any task event is received.
 *
 * This ensures ALL pages (overview, my-tasks, project boards, reports, calendar)
 * stay in sync when any user changes a task status, creates/deletes tasks, etc.
 *
 * Uses Supabase Broadcast (not postgres_changes) since the server actions
 * already broadcast to "task-notifications" via broadcastTaskNotification().
 */
export function useTaskRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("task-notifications")
      .on("broadcast", { event: "task-event" }, () => {
        // Refresh server components to get latest data
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
}
