"use client";

import { useState, startTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { TaskStatus, Priority, Role } from "@prisma/client";
import { reassignTask } from "@/app/actions/tasks";
import { categorizeByTime, sortByUrgencyWithinStatus, isTaskOverdue, isTaskDueToday } from "@/lib/task-group-utils";

// ─── PERF: Lazy-load heavy modal/drawer but prefetch eagerly ────────────────
const TaskDetailDrawer = dynamic(
  () => import("./task-detail-drawer").then((m) => m.TaskDetailDrawer),
  { ssr: false }
);
const CreateTaskModal = dynamic(
  () => import("./create-task-modal").then((m) => m.CreateTaskModal),
  { ssr: false }
);

// Prefetch: trigger module compilation immediately on page load
if (typeof window !== "undefined") {
  import("./task-detail-drawer");
  import("./create-task-modal");
}

const STATUS_SECTIONS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: TaskStatus.PENDING_APPROVAL, label: "Pending Approval", accent: "border-l-cyan-500" },
  { status: TaskStatus.TODO, label: "To Do", accent: "border-l-blue-500" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", accent: "border-l-amber-500" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", accent: "border-l-purple-500" },
  { status: TaskStatus.REVISION, label: "Revision", accent: "border-l-red-500" },
  { status: TaskStatus.CLIENT_APPROVAL, label: "Client Approval", accent: "border-l-teal-500" },
  { status: TaskStatus.CLIENT_REVISION, label: "Client Revision", accent: "border-l-orange-500" },
  { status: TaskStatus.APPROVED, label: "Approved", accent: "border-l-green-500" },
  { status: TaskStatus.DONE, label: "Done", accent: "border-l-green-700" },
  { status: TaskStatus.BACKLOG, label: "Backlog", accent: "border-l-neutral-400" },
];

const PRIORITY_CHIP: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  image: string | null;
}

interface TaskType {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  createdAt: Date;
  revisionCount: number;
  projectId: string | null;
  assignedById?: string | null;
  assignedTo: { id: string; name: string; image: string | null } | null;
  assignedBy?: { id: string; name: string } | null;
  assignees?: Array<{ id: string; name: string; image: string | null }> | null;
  project?: {
    id: string;
    title: string;
    client?: {
      id: string;
      companyName: string;
      brandColor?: string | null;
    } | null;
  } | null;
  _count: { files: number };
  subtasks: Array<{ id: string; title: string; isDone: boolean }>;
}

interface MyTasksListProps {
  tasks: TaskType[];
  userId: string;
  userRole: Role;
  canAssign?: boolean;
  canCreateTask?: boolean;
  teamMembers?: TeamMember[];
  projects?: Array<{ id: string; title: string; clientId?: string | null }>;
  brands?: Array<{ id: string; companyName: string }>;
}

export function MyTasksList({
  tasks,
  userId,
  userRole,
  canAssign = false,
  canCreateTask = false,
  teamMembers = [],
  projects = [],
  brands = [],
}: MyTasksListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ─── Filter State ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [dueFilter, setDueFilter] = useState<"ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NO_DATE">("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "Due Date" | "title" | "created">("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupView, setGroupView] = useState<"STATUS" | "TIMELINE">("STATUS");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeDrawerTask, setActiveDrawerTask] = useState<TaskType | null>(null);

  // Sync action=new-task from other pages to open the modal instantly
  useEffect(() => {
    if (searchParams.get("action") === "new-task") {
      setIsCreateModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      router.replace(`/tasks?${params.toString()}`);
    }
  }, [searchParams, router]);

  // Sync filter from URL query params (e.g., ?filter=review from overview KPI)
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam && !activeFilter) {
      setActiveFilter(filterParam);
    }
  }, [searchParams, activeFilter]);
  
  useEffect(() => {
    const urlTaskId = searchParams.get("taskId");
    if (urlTaskId && !selectedTaskId) {
      setSelectedTaskId(urlTaskId);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("taskId");
      router.replace(`/tasks?${params.toString()}`);
    }
  }, [searchParams, selectedTaskId, router]);

  // NOTE: Task realtime subscription is handled globally in ChatProvider.
  // Do NOT re-subscribe to "task-notifications" here — duplicate subscriptions
  // on the same Supabase singleton client cause the ChatProvider's subscription
  // to silently die, breaking toast notifications.

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateSuccess = (taskId: string) => {
    toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <span className="font-headline uppercase text-sm">Task Created</span>
          <button
            onClick={() => {
              setSelectedTaskId(taskId);
              toast.dismiss(t.id);
            }}
            className="text-xs font-mono uppercase bg-on-surface text-surface px-3 py-1.5 hover:opacity-80 transition-opacity"
          >
            View Task
          </button>
        </div>
      ),
      { duration: 5000 }
    );
  };

  const clearFilter = () => {
    setActiveFilter(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    router.replace(`/tasks?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
    setAssigneeFilter("ALL");
    setProjectFilter("ALL");
    setDueFilter("ALL");
    setActiveFilter(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    router.replace(`/tasks?${params.toString()}`);
  };

  const hasAnyFilter = !!(searchQuery || priorityFilter !== "ALL" || statusFilter !== "ALL" || assigneeFilter !== "ALL" || projectFilter !== "ALL" || dueFilter !== "ALL" || activeFilter);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Sync selected task to active drawer task for exit transition tracking
  useEffect(() => {
    if (selectedTask) {
      setActiveDrawerTask(selectedTask);
    }
  }, [selectedTask]);

  // ─── Apply all filters composably ─────────────────────────────────────────
  const REVIEW_STATUSES: TaskStatus[] = [TaskStatus.IN_REVIEW, TaskStatus.CLIENT_APPROVAL, TaskStatus.REVISION];
  const filteredTasks = tasks.filter((t) => {
    // URL-based quick filter from overview KPIs
    if (activeFilter === "review" && !REVIEW_STATUSES.includes(t.status)) return false;
    if (activeFilter === "due") {
      if (!t.dueDate) return false;
      const daysLeft = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
      if (!(daysLeft <= 7 && daysLeft >= 0 && t.status !== TaskStatus.DONE && t.status !== TaskStatus.APPROVED)) return false;
    }
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchProject = t.project?.title?.toLowerCase().includes(q) || false;
      const matchBrand = t.project?.client?.companyName?.toLowerCase().includes(q) || false;
      const matchAssignee = t.assignedTo?.name?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchProject && !matchBrand && !matchAssignee) return false;
    }
    // Priority
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    // Status
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    // Assignee
    if (assigneeFilter !== "ALL") {
      if (assigneeFilter === "MINE" && t.assignedTo?.id !== userId) return false;
      if (assigneeFilter === "UNASSIGNED" && t.assignedTo !== null) return false;
      if (assigneeFilter !== "MINE" && assigneeFilter !== "UNASSIGNED" && t.assignedTo?.id !== assigneeFilter) return false;
    }
    // Project
    if (projectFilter !== "ALL" && t.projectId !== projectFilter) return false;
    // Due date
    if (dueFilter !== "ALL") {
      if (dueFilter === "NO_DATE") return t.dueDate === null;
      if (!t.dueDate) return false;
      const now = new Date();
      const due = new Date(t.dueDate);
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      if (dueFilter === "OVERDUE") return daysLeft < 0 && t.status !== "DONE" && t.status !== "APPROVED";
      if (dueFilter === "TODAY") return daysLeft === 0;
      if (dueFilter === "THIS_WEEK") return daysLeft >= 0 && daysLeft <= 7;
    }
    return true;
  });

  // Apply sorting
  const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  filteredTasks.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "priority":
        cmp = (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2);
        break;
      case "Due Date": {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db2 = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db2;
        break;
      }
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "created":
        cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const grouped = STATUS_SECTIONS.map((section) => ({
    ...section,
    tasks: sortByUrgencyWithinStatus(filteredTasks.filter((t) => t.status === section.status)),
  })).filter((section) => section.tasks.length > 0);

  // Timeline view grouping
  const timelineGroups = useMemo(() => categorizeByTime(filteredTasks), [filteredTasks]);

  // Unique assignees and projects from current tasks for filter dropdowns
  const uniqueAssignees = Array.from(
    new Map(tasks.filter((t) => t.assignedTo).map((t) => [t.assignedTo!.id, t.assignedTo!.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const uniqueProjects = Array.from(
    new Map(tasks.filter((t) => t.project).map((t) => [t.project!.id, t.project!.title])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const handleReassign = (taskId: string, newAssigneeId: string) => {
    setReassigning(true);
    startTransition(async () => {
      try {
        await reassignTask(taskId, newAssigneeId);
        setAssigningTaskId(null);
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to reassign task.", { duration: 5000 });
      } finally {
        setReassigning(false);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between max-sm:flex-col max-sm:items-start gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text leading-none">
              {userRole === "SUPER_ADMIN" ? "All Tasks" : "My Tasks"}
            </h1>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-on-surface/50">
              {userRole === "SUPER_ADMIN" ? "Manage & Assign" : userRole === "ADMIN" ? "My Team & Assignments" : "Active Assignments"} · {tasks.length} Items
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canCreateTask && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-lg bg-primary-container text-white px-3 sm:px-5 py-2 sm:py-2.5 font-headline text-[10px] sm:text-xs uppercase hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Task
              </button>
            )}
            <Link
              href="/projects/new"
              className="brutalist-border text-outline hover:text-foreground hover:bg-card/10 px-3 sm:px-4 py-2 sm:py-2.5 font-headline text-[10px] sm:text-xs uppercase transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
              Project
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="brutalist-border bg-card p-3 space-y-3">
        {/* Top row: Search + toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-on-surface/30">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, projects, brands..."
              className="w-full h-9 brutalist-border bg-transparent pl-9 pr-3 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface">
                <span className="material-symbols-outlined text-xs">Close</span>
              </button>
            )}
          </div>

          {/* Filter toggle + Sort + View */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 brutalist-border text-[11px] font-headline uppercase tracking-widest transition-colors ${
                showFilters || hasAnyFilter ? "bg-primary/10 text-primary border-primary/30" : "text-on-surface/60 hover:text-foreground"
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Filters
              {hasAnyFilter && (
                <span className="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 font-mono min-w-[18px] text-center">
                  {[searchQuery, priorityFilter !== "ALL", statusFilter !== "ALL", assigneeFilter !== "ALL", projectFilter !== "ALL", dueFilter !== "ALL", activeFilter].filter(Boolean).length}
                </span>
              )}
            </button>
            {/* Sort Controls */}
            <div className="flex items-center gap-1 ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent font-mono text-[11px] text-on-surface/60 uppercase tracking-wider border-none focus:outline-none cursor-pointer"
              >
                <option value="priority">Sort: Priority</option>
                <option value="Due Date">Sort: Due Date</option>
                <option value="title">Sort: Title</option>
                <option value="created">Sort: Created</option>
              </select>
              <button
                onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
                className="flex items-center justify-center w-6 h-6 text-on-surface/40 hover:text-primary transition-colors"
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                <span className="material-symbols-outlined text-sm">
                  {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
                </span>
              </button>
            </div>
            {/* View Toggle */}
            <div className="flex items-center brutalist-border overflow-hidden">
              <button
                onClick={() => setGroupView("STATUS")}
                className={`px-2.5 py-1.5 font-headline text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1 ${
                  groupView === "STATUS" ? "bg-primary text-white" : "text-on-surface/50 hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-xs">view_list</span>
                Status
              </button>
              <button
                onClick={() => setGroupView("TIMELINE")}
                className={`px-2.5 py-1.5 font-headline text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1 border-l border-on-surface/10 ${
                  groupView === "TIMELINE" ? "bg-primary text-white" : "text-on-surface/50 hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-xs">schedule</span>
                Timeline
              </button>
            </div>
            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-headline uppercase tracking-widest text-error/60 hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-xs">delete_sweep</span>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-in slide-in-from-top-2 duration-200">
            {/* Priority */}
            <div>
              <label className="block font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-1 px-0.5">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | "ALL")}
                className="w-full h-8 brutalist-border bg-transparent px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">ALL</option>
                <option value="URGENT">🔴 URGENT</option>
                <option value="HIGH">🟠 HIGH</option>
                <option value="MEDIUM">🟡 MEDIUM</option>
                <option value="LOW">⚪ LOW</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-1 px-0.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "ALL")}
                className="w-full h-8 brutalist-border bg-transparent px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">ALL</option>
                {STATUS_SECTIONS.map((s) => (
                  <option key={s.status} value={s.status}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Assignee — for all roles */}
            <div>
              <label className="block font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-1 px-0.5">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full h-8 brutalist-border bg-transparent px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">ALL</option>
                <option value="MINE">My Tasks</option>
                <option value="UNASSIGNED">UNASSIGNED</option>
                {uniqueAssignees.map(([id, name]) => (
                  <option key={id} value={id}>{name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="block font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-1 px-0.5">Project</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full h-8 brutalist-border bg-transparent px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">ALL</option>
                {uniqueProjects.map(([id, title]) => (
                  <option key={id} value={id}>{title.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-1 px-0.5">Due Date</label>
              <select
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value as typeof dueFilter)}
                className="w-full h-8 brutalist-border bg-transparent px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">ALL</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="TODAY">Due Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="NO_DATE">No Due Date</option>
              </select>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/15 text-amber-400 text-[10px] font-headline uppercase tracking-widest brutalist-border border-amber-500/30">
                <span className="material-symbols-outlined text-[10px]">filter_alt</span>
                {activeFilter === "review" ? "PENDING_REVIEW" : activeFilter === "due" ? "DUE_THIS_WEEK" : activeFilter.toUpperCase()}
                <button onClick={clearFilter} className="ml-0.5 hover:text-amber-200"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                SEARCH: &quot;{searchQuery.toUpperCase()}&quot;
                <button onClick={() => setSearchQuery("")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {priorityFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                PRIORITY: {priorityFilter}
                <button onClick={() => setPriorityFilter("ALL")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                STATUS: {statusFilter}
                <button onClick={() => setStatusFilter("ALL")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {assigneeFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                ASSIGNEE: {assigneeFilter === "MINE" ? "MY_TASKS" : assigneeFilter === "UNASSIGNED" ? "UNASSIGNED" : uniqueAssignees.find(([id]) => id === assigneeFilter)?.[1]?.toUpperCase() || assigneeFilter}
                <button onClick={() => setAssigneeFilter("ALL")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {projectFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                PROJECT: {uniqueProjects.find(([id]) => id === projectFilter)?.[1]?.toUpperCase() || projectFilter}
                <button onClick={() => setProjectFilter("ALL")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
            {dueFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest brutalist-border border-primary/20">
                DUE: {dueFilter.replace("_", " ")}
                <button onClick={() => setDueFilter("ALL")} className="ml-0.5 hover:text-primary/60"><span className="material-symbols-outlined text-[10px]">Close</span></button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
      {grouped.length === 0 ? (
        <div className="brutalist-border bg-card p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-3 block">task_alt</span>
          <h3 className="font-headline text-lg uppercase tracking-tight text-card-text mb-1">
            {hasAnyFilter ? "NO_MATCHING_TASKS" : "NO_TASKS_ASSIGNED"}
          </h3>
          <p className="font-mono text-xs uppercase text-muted-foreground tracking-widest">
            {hasAnyFilter ? "TRY ADJUSTING YOUR FILTERS" : "ALL QUEUES ARE CLEAR"}
          </p>
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 brutalist-border text-[10px] font-headline uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
            >
              CLEAR ALL FILTERS
            </button>
          )}
        </div>
      ) : groupView === "TIMELINE" ? (
        /* ─── Timeline View: Group by urgency ─── */
        timelineGroups.map(({ group, config, tasks: groupTasks }) => (
          <div key={group} className={`brutalist-border bg-card border-l-4 ${config.accentBorder}`}>
            {/* Section Header */}
            <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${config.accentText}`}>{config.icon}</span>
                <h3 className={`font-headline text-xs uppercase tracking-[0.2em] ${config.accentText}`}>
                  {config.label}
                </h3>
              </div>
              <span className={`text-white px-2 py-0.5 text-[10px] font-mono min-w-[24px] text-center ${config.badgeBg}`}>
                {groupTasks.length}
              </span>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-outline-variant/30">
              {groupTasks.map((task) => {
                const dueLabel = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : null;
                const taskOverdue = isTaskOverdue(task.dueDate, task.status);
                const taskToday = isTaskDueToday(task.dueDate);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`px-4 py-4 md:px-5 md:py-3 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors group gap-3`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-headline uppercase ${PRIORITY_CHIP[task.priority]} flex-shrink-0 mt-1 sm:mt-0`}>
                        {task.priority[0]}
                      </span>
                      <div className="min-w-0">
                        <span className="font-headline text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors block leading-tight">
                          {task.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          {/* Status badge */}
                          <span className={`px-1.5 py-0.5 text-[11px] font-headline uppercase tracking-widest ${
                            task.status === "TODO" ? "bg-blue-500/20 text-blue-400" :
                            task.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-400" :
                            task.status === "IN_REVIEW" ? "bg-purple-500/20 text-purple-400" :
                            task.status === "REVISION" ? "bg-red-500/20 text-red-400" :
                            task.status === "DONE" || task.status === "APPROVED" ? "bg-green-500/20 text-green-400" :
                            "bg-neutral-500/20 text-neutral-400"
                          }`}>
                            {task.status.replace(/_/g, " ")}
                          </span>
                          {task.project?.client?.companyName && (
                            <span className="font-mono text-[10px] uppercase text-primary/70 tracking-widest font-bold">
                              {task.project.client.companyName}
                            </span>
                          )}
                          {task.project && (
                            <span className="font-mono text-[10px] uppercase text-on-surface/40 tracking-widest">
                              {task.project.title}
                            </span>
                          )}
                          {task.assignedTo && (
                            <span className="font-mono text-[10px] uppercase text-primary/60 tracking-widest">
                              → {task.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 ml-8 sm:ml-0">
                      {taskOverdue && (
                        <span className="text-[11px] font-mono uppercase text-white bg-red-600 px-1.5 py-0.5 font-bold animate-pulse">OVERDUE</span>
                      )}
                      {taskToday && !taskOverdue && (
                        <span className="text-[11px] font-mono uppercase text-white bg-amber-600 px-1.5 py-0.5 font-bold">TODAY</span>
                      )}
                      {dueLabel && (
                        <span className={`font-mono text-[11px] ${taskOverdue ? "text-red-500 font-bold" : "text-on-surface/40"}`}>
                          {dueLabel}
                        </span>
                      )}
                      {task._count.files > 0 && (
                        <span className="flex items-center gap-0.5 font-mono text-[11px] text-on-surface/30">
                          <span className="material-symbols-outlined text-xs">attach_file</span>
                          {task._count.files}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        grouped.map((section) => (
          <div key={section.status} className={`brutalist-border bg-card border-l-4 ${section.accent}`}>
            {/* Section Header */}
            <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
                {section.label}
              </h3>
              <span className="bg-[#180065] text-white px-2 py-0.5 text-[10px] font-mono min-w-[24px] text-center">
                {section.tasks.length}
              </span>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-outline-variant/30">
              {section.tasks.map((task) => {
                const dueLabel = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : null;
                const isOverdue = task.dueDate
                  ? new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "APPROVED"
                  : false;

                return (
                  <div key={task.id}>
                    <div
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`px-4 py-4 md:px-5 md:py-3 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors group gap-3 ${
                        isOverdue ? "border-l-2 border-l-red-500 bg-red-500/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-headline uppercase ${PRIORITY_CHIP[task.priority]} flex-shrink-0 mt-1 sm:mt-0`}>
                          {task.priority[0]}
                        </span>
                        <div className="min-w-0">
                          <span className="font-headline text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors block leading-tight">
                            {task.title}
                          </span>
                          {/* Show project name, brand, assignee(s), and assigner for Admin/Super Admin */}
                          {canAssign && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {task.project?.client?.companyName && (
                                <span className="font-mono text-[10px] uppercase text-primary/70 tracking-widest font-bold">
                                  {task.project.client.companyName}
                                </span>
                              )}
                              {task.project && (
                                <span className="font-mono text-[10px] uppercase text-on-surface/40 tracking-widest">
                                  {task.project.client?.companyName ? "• " : ""}{task.project.title}
                                </span>
                              )}
                              {task.assignees && task.assignees.length > 0 ? (
                                <span className="font-mono text-[10px] uppercase text-primary/60 tracking-widest">
                                  → {task.assignees.map((a) => a.name).join(", ")}
                                </span>
                              ) : task.assignedTo ? (
                                <span className="font-mono text-[10px] uppercase text-primary/60 tracking-widest">
                                  → {task.assignedTo.name}
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] uppercase text-error/60 tracking-widest">
                                  UNASSIGNED
                                </span>
                              )}
                              {task.assignedBy && (
                                <span className="font-mono text-[10px] uppercase text-on-surface/30 tracking-widest">
                                  BY {task.assignedBy.name}
                                </span>
                              )}
                            </div>
                          )}
                          {/* For non-admins: show brand, project, assigner, and co-assignees */}
                          {!canAssign && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {task.project?.client?.companyName && (
                                <span className="font-mono text-[10px] uppercase text-primary/70 tracking-widest font-bold">
                                  {task.project.client.companyName}
                                </span>
                              )}
                              {task.project && (
                                <span className="font-mono text-[10px] uppercase text-on-surface/40 tracking-widest">
                                  {task.project.client?.companyName ? "• " : ""}{task.project.title}
                                </span>
                              )}
                              {task.assignedBy && (
                                <span className="font-mono text-[10px] uppercase text-on-surface/30 tracking-widest">
                                  {task.project ? "• " : ""}BY {task.assignedBy.id === userId ? "MYSELF" : task.assignedBy.name}
                                </span>
                              )}
                              {task.assignees && task.assignees.length > 1 && (
                                <span className="font-mono text-[10px] uppercase text-primary/60 tracking-widest">
                                  • WITH {task.assignees.filter((a) => a.id !== userId).map((a) => a.name).join(", ")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {task.revisionCount > 0 ? (
                          <span className="text-[10px] font-mono text-red-600 bg-red-500/10 px-1.5 py-0.5 brutalist-border border-red-200 flex-shrink-0">
                            R{task.revisionCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 text-[11px] font-mono text-muted-foreground uppercase flex-shrink-0">
                        <div className="flex items-center gap-3">
                          {task.subtasks && task.subtasks.length > 0 ? (
                            <span className="flex items-center gap-0.5" title={`${task.subtasks.filter((s: any) => s.isDone).length}/${task.subtasks.length} subtasks done`}>
                              <span className="material-symbols-outlined text-xs">checklist</span>
                              <span className={task.subtasks.every((s: any) => s.isDone) ? "text-green-500" : ""}>
                                {task.subtasks.filter((s: any) => s.isDone).length}/{task.subtasks.length}
                              </span>
                            </span>
                          ) : null}
                          {task._count.files > 0 ? (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">attach_file</span>
                              {task._count.files}
                            </span>
                          ) : null}
                          {dueLabel ? (
                            <span className={isOverdue ? "text-red-600 font-bold" : ""}>{dueLabel}</span>
                          ) : null}
                          {isOverdue && (
                            <span className="text-[11px] font-mono uppercase text-white bg-red-600 px-1.5 py-0.5 font-bold animate-pulse">OVERDUE</span>
                          )}
                          {!isOverdue && isTaskDueToday(task.dueDate) && (
                            <span className="text-[11px] font-mono uppercase text-white bg-amber-600 px-1.5 py-0.5 font-bold">TODAY</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Assign button for Admin/Super Admin */}
                          {canAssign && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningTaskId(assigningTaskId === task.id ? null : task.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 sm:px-2 sm:py-1 brutalist-border text-[11px] sm:text-[10px] hover:bg-primary/10 hover:text-primary transition-colors bg-card sm:bg-transparent"
                              title="Assign task"
                            >
                              <span className="material-symbols-outlined text-xs">person_add</span>
                              <span className="sm:inline">ASSIGN</span>
                            </button>
                          )}
                          <span className="material-symbols-outlined text-sm text-neutral-400 group-hover:text-primary transition-colors">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Assignment Dropdown — Multi-select for managers */}
                    {canAssign && assigningTaskId === task.id && (
                      <div className="px-4 md:px-5 pb-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="brutalist-border bg-surface-container-lowest p-4 md:p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-headline text-[11px] uppercase tracking-widest text-on-surface/60">
                              ASSIGN_TO → {selectedAssignees.length > 0 && (
                                <span className="text-primary">{selectedAssignees.length} SELECTED</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedAssignees.length > 0 && (
                                <button
                                  onClick={() => {
                                    // Assign primary (first) + fire off all at once
                                    const primary = selectedAssignees[0];
                                    handleReassign(task.id, primary);
                                    // Assign additional co-assignees
                                    selectedAssignees.slice(1).forEach((id) => {
                                      reassignTask(task.id, id).catch(() => {});
                                    });
                                    setSelectedAssignees([]);
                                  }}
                                  disabled={reassigning}
                                  className="flex items-center gap-1 px-3 py-1 bg-primary text-on-primary font-headline text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  CONFIRM
                                </button>
                              )}
                              <button
                                onClick={() => { setAssigningTaskId(null); setSelectedAssignees([]); }}
                                className="material-symbols-outlined text-xs text-on-surface/40 hover:text-error p-1"
                              >
                                close
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 sm:max-h-40 overflow-y-auto pr-1">
                            {teamMembers.map((member) => {
                              const isSelected = selectedAssignees.includes(member.id);
                              const isCurrent = member.id === task.assignedTo?.id;
                              return (
                                <button
                                  key={member.id}
                                  disabled={reassigning}
                                  onClick={() => {
                                    if (isCurrent) return;
                                    setSelectedAssignees((prev) =>
                                      prev.includes(member.id)
                                        ? prev.filter((id) => id !== member.id)
                                        : [...prev, member.id]
                                    );
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 brutalist-border text-left transition-colors ${
                                    isCurrent
                                      ? "bg-primary/10 border-primary/30 opacity-60 cursor-default"
                                      : isSelected
                                      ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30"
                                      : "hover:bg-primary/10 hover:border-primary/30"
                                  }`}
                                >
                                  <div className={`h-6 w-6 flex items-center justify-center text-[11px] font-headline font-bold uppercase flex-shrink-0 ${
                                    isSelected ? "bg-primary text-on-primary" : "bg-surface-container-high"
                                  }`}>
                                    {isSelected ? "✓" : member.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-headline text-[10px] uppercase tracking-wider truncate text-on-surface">
                                      {member.name}
                                    </p>
                                    <p className="font-mono text-[11px] uppercase text-on-surface/40">
                                      {member.role} · {member.department || "—"}
                                    </p>
                                  </div>
                                  {isCurrent && (
                                    <span className="material-symbols-outlined text-xs text-primary ml-auto flex-shrink-0">check</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {reassigning && (
                            <div className="flex items-center gap-2 text-primary">
                              <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                              <span className="font-mono text-[11px] uppercase tracking-widest">Reassigning...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Task Detail Drawer */}
      {activeDrawerTask ? (
        <TaskDetailDrawer
          task={activeDrawerTask}
          userId={userId}
          userRole={userRole}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onExited={() => setActiveDrawerTask(null)}
          teamMembers={teamMembers}
        />
      ) : null}

      {/* Global Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          projects={projects}
          brands={brands}
          teamMembers={teamMembers}
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onSuccess={handleCreateSuccess}
        />
      )}
      </div>
    </div>
  );
}
