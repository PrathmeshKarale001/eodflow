// =============================================================================
// Task Grouping & Sorting Utilities
// Shared by dashboards, /tasks page, and kanban board
// =============================================================================

import type { Priority } from "@prisma/client";

// ---------------------------------------------------------------------------
// Time-based group definitions
// ---------------------------------------------------------------------------

export type TimeGroup =
  | "OVERDUE"
  | "TODAY"
  | "THIS_WEEK"
  | "UPCOMING"
  | "NO_DUE_DATE";

export interface TimeGroupConfig {
  label: string;
  icon: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  badgeBg: string;
}

export const TIME_GROUP_CONFIG: Record<TimeGroup, TimeGroupConfig> = {
  OVERDUE: {
    label: "OVERDUE",
    icon: "warning",
    accentBorder: "border-l-red-500",
    accentBg: "bg-red-500/10",
    accentText: "text-red-400",
    badgeBg: "bg-red-600",
  },
  TODAY: {
    label: "DUE TODAY",
    icon: "today",
    accentBorder: "border-l-amber-500",
    accentBg: "bg-amber-500/10",
    accentText: "text-amber-400",
    badgeBg: "bg-amber-600",
  },
  THIS_WEEK: {
    label: "THIS WEEK",
    icon: "date_range",
    accentBorder: "border-l-blue-500",
    accentBg: "bg-blue-500/10",
    accentText: "text-blue-400",
    badgeBg: "bg-blue-600",
  },
  UPCOMING: {
    label: "UPCOMING",
    icon: "event",
    accentBorder: "border-l-purple-500",
    accentBg: "bg-purple-500/10",
    accentText: "text-purple-400",
    badgeBg: "bg-purple-600",
  },
  NO_DUE_DATE: {
    label: "NO DUE DATE",
    icon: "event_busy",
    accentBorder: "border-l-neutral-400",
    accentBg: "bg-neutral-500/10",
    accentText: "text-on-surface/40",
    badgeBg: "bg-neutral-600",
  },
};

// The order in which groups are displayed (urgency-first)
export const TIME_GROUP_ORDER: TimeGroup[] = [
  "OVERDUE",
  "TODAY",
  "THIS_WEEK",
  "UPCOMING",
  "NO_DUE_DATE",
];

// ---------------------------------------------------------------------------
// Priority ordering (for sorting within groups)
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// ---------------------------------------------------------------------------
// Core: Classify a single task into a time group
// ---------------------------------------------------------------------------

/**
 * Determines which time group a task belongs to based on its due date
 * and completion status.
 *
 * Completed tasks (DONE/APPROVED) are excluded from grouping by default
 * unless `includeCompleted` is true.
 */
export function getTimeGroup(
  dueDate: Date | string | null | undefined,
  status?: string,
  includeCompleted = false
): TimeGroup {
  const completedStatuses = ["DONE", "APPROVED"];
  if (!includeCompleted && status && completedStatuses.includes(status)) {
    // Completed tasks don't appear in time groups by default
    return "NO_DUE_DATE";
  }

  if (!dueDate) return "NO_DUE_DATE";

  const due = new Date(dueDate);
  const now = new Date();

  // Normalize to start of day for comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // End of this week (Sunday 23:59:59)
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - dayOfWeek));

  if (due < startOfToday) return "OVERDUE";
  if (due < endOfToday) return "TODAY";
  if (due < endOfWeek) return "THIS_WEEK";
  return "UPCOMING";
}

// ---------------------------------------------------------------------------
// Core: Group an array of tasks by time
// ---------------------------------------------------------------------------

interface GroupableTask {
  dueDate: Date | string | null;
  status?: string;
  priority?: string | Priority;
  [key: string]: any;
}

export interface GroupedTasks<T extends GroupableTask> {
  group: TimeGroup;
  config: TimeGroupConfig;
  tasks: T[];
}

/**
 * Groups tasks by time category and sorts within each group by priority → due date.
 * Empty groups are omitted from the result.
 *
 * @param tasks Array of tasks with at least { dueDate, status?, priority? }
 * @param options.includeCompleted Whether to include DONE/APPROVED tasks (default: false)
 * @param options.includeEmpty Whether to include groups with 0 tasks (default: false)
 */
export function categorizeByTime<T extends GroupableTask>(
  tasks: T[],
  options: { includeCompleted?: boolean; includeEmpty?: boolean } = {}
): GroupedTasks<T>[] {
  const { includeCompleted = false, includeEmpty = false } = options;

  // Initialize all groups
  const groupMap: Record<TimeGroup, T[]> = {
    OVERDUE: [],
    TODAY: [],
    THIS_WEEK: [],
    UPCOMING: [],
    NO_DUE_DATE: [],
  };

  // Classify each task
  for (const task of tasks) {
    const group = getTimeGroup(task.dueDate, task.status, includeCompleted);
    groupMap[group].push(task);
  }

  // Sort within each group by priority → due date
  for (const group of TIME_GROUP_ORDER) {
    groupMap[group] = sortByPriorityThenDue(groupMap[group]);
  }

  // Build result in display order
  return TIME_GROUP_ORDER
    .filter((group) => includeEmpty || groupMap[group].length > 0)
    .map((group) => ({
      group,
      config: TIME_GROUP_CONFIG[group],
      tasks: groupMap[group],
    }));
}

// ---------------------------------------------------------------------------
// Core: Sort tasks by priority (URGENT first) then due date (earliest first)
// ---------------------------------------------------------------------------

export function sortByPriorityThenDue<T extends GroupableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Sort by priority first (URGENT < HIGH < MEDIUM < LOW)
    const priorityA = PRIORITY_ORDER[a.priority as string] ?? 2;
    const priorityB = PRIORITY_ORDER[b.priority as string] ?? 2;
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Then by due date (earliest first, no-date last)
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return dateA - dateB;
  });
}

// ---------------------------------------------------------------------------
// Helper: Check if a task is overdue
// ---------------------------------------------------------------------------

export function isTaskOverdue(
  dueDate: Date | string | null | undefined,
  status?: string
): boolean {
  if (!dueDate) return false;
  const completedStatuses = ["DONE", "APPROVED"];
  if (status && completedStatuses.includes(status)) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

// ---------------------------------------------------------------------------
// Helper: Check if a task is due today
// ---------------------------------------------------------------------------

export function isTaskDueToday(
  dueDate: Date | string | null | undefined
): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

// ---------------------------------------------------------------------------
// Helper: Get urgency-sorted tasks within a status group
// Used by the /tasks page STATUS view to float overdue/today to top
// ---------------------------------------------------------------------------

export function sortByUrgencyWithinStatus<T extends GroupableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Overdue tasks first
    const aOverdue = isTaskOverdue(a.dueDate, a.status) ? 0 : 1;
    const bOverdue = isTaskOverdue(b.dueDate, b.status) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    // Then today tasks
    const aToday = isTaskDueToday(a.dueDate) ? 0 : 1;
    const bToday = isTaskDueToday(b.dueDate) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    // Then by priority
    const priorityA = PRIORITY_ORDER[a.priority as string] ?? 2;
    const priorityB = PRIORITY_ORDER[b.priority as string] ?? 2;
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Then by due date
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return dateA - dateB;
  });
}
