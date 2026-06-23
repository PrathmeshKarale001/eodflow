import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Role, TaskStatus, ProjectStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "viewTeamWorkload")) {
    return notFound();
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const isSuperAdmin = userRole === Role.SUPER_ADMIN;
  const userId = session.user.id;

  // ADMIN: pre-fetch managed project IDs for scoping
  let managedProjectIds: string[] = [];
  if (!isSuperAdmin) {
    const managedProjects = await db.project.findMany({
      where: {
        OR: [
          { assignedManagerId: userId },
          { createdById: userId },
        ],
      },
      select: { id: true },
    });
    managedProjectIds = managedProjects.map((p) => p.id);
  }

  // Build project/task scope for ADMIN
  const projectScope = isSuperAdmin ? {} : { id: { in: managedProjectIds } };
  const taskScope = isSuperAdmin ? {} : { projectId: { in: managedProjectIds } };

  // Parallel fetch all report data
  const [
    projectsByStatus,
    tasksByStatus,
    overdueTasks,
    teamMembers,
    recentActivity,
    weeklyCompletions,
    monthlyCompletions,
    totalTimeThisWeek,
    projectsWithProgress,
  ] = await Promise.all([
    // Projects by status
    db.project.groupBy({
      by: ["status"],
      where: projectScope,
      _count: { id: true },
    }),
    // Tasks by status
    db.task.groupBy({
      by: ["status"],
      where: taskScope,
      _count: { id: true },
    }),
    // Overdue tasks
    db.task.count({
      where: {
        ...taskScope,
        dueDate: { lt: now },
        status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
      },
    }),
    // Team performance (tasks per user — scoped for ADMIN)
    db.user.findMany({
      where: {
        isActive: true,
        ...(isSuperAdmin ? {} : {
          OR: [
            { assignedTasks: { some: { projectId: { in: managedProjectIds } } } },
            { id: userId },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        _count: {
          select: {
            assignedTasks: isSuperAdmin ? true : { where: { projectId: { in: managedProjectIds } } },
          },
        },
        assignedTasks: {
          select: { status: true },
          where: {
            status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
            completedAt: { gte: startOfMonth },
            ...(isSuperAdmin ? {} : { projectId: { in: managedProjectIds } }),
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Recent activity
    db.activityLog.findMany({
      take: 20,
      where: isSuperAdmin ? {} : { projectId: { in: managedProjectIds } },
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
        project: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Completed this week
    db.task.count({
      where: {
        ...taskScope,
        status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
        completedAt: { gte: startOfWeek },
      },
    }),
    // Completed this month
    db.task.count({
      where: {
        ...taskScope,
        status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
        completedAt: { gte: startOfMonth },
      },
    }),
    // Total time logged this week (in minutes)
    db.timeEntry.aggregate({
      where: {
        entryDate: { gte: startOfWeek },
        ...(isSuperAdmin ? {} : { task: { projectId: { in: managedProjectIds } } }),
      },
      _sum: { durationMins: true },
    }),
    // Projects with task progress
    db.project.findMany({
      where: {
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.DRAFT] },
        ...projectScope,
      },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        client: { select: { companyName: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  // Transform data for client
  const projectStatusCounts = Object.fromEntries(
    projectsByStatus.map((p) => [p.status, p._count.id])
  );

  const taskStatusCounts = Object.fromEntries(
    tasksByStatus.map((t) => [t.status, t._count.id])
  );

  const totalTasks = Object.values(taskStatusCounts).reduce((a: number, b: number) => a + b, 0);
  const completedTasks = (taskStatusCounts[TaskStatus.DONE] || 0) + (taskStatusCounts[TaskStatus.APPROVED] || 0);

  const teamPerformance = teamMembers.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    department: m.department,
    totalTasks: m._count.assignedTasks,
    completedThisMonth: m.assignedTasks.length,
  }));

  const projectProgress = projectsWithProgress.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE" || t.status === "APPROVED").length;
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      clientName: p.client.companyName,
      deadline: p.deadline,
      taskCount: total,
      completedCount: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // Fetch detailed tasks for Director report
  let managementTasksReport: any[] = [];
  let teamPerformanceReport: any[] = [];

  if (userRole === Role.SUPER_ADMIN) {
    const [managementEmployeeTasks, allUsersWithStats, timeSums] = await Promise.all([
      db.task.findMany({
        where: {
          assignedTo: {
            role: Role.EMPLOYEE,
          },
          OR: [
            { assignedBy: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } } },
            { assignedBy: { department: "MANAGEMENT" } }
          ]
        },
        include: {
          assignedTo: { select: { name: true, department: true } },
          assignedBy: { select: { name: true, role: true } },
          project: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          assignedTasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
              createdAt: true,
              startedAt: true,
              revisionCount: true,
              project: { select: { title: true } },
              assignedBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" as const },
          },
          createdTasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
              createdAt: true,
              startedAt: true,
              revisionCount: true,
              project: { select: { title: true } },
              assignedTo: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" as const },
          },
          managedProjects: {
            select: { id: true }
          },
          activities: {
            where: {
              action: { in: ["APPROVED", "REVISION_REQUESTED", "STATUS_CHANGED"] },
            },
            select: {
              action: true,
              metadata: true,
            }
          }
        }
      }),
      db.timeEntry.groupBy({
        by: ["userId"],
        _sum: { durationMins: true },
      })
    ]);

    const hoursLoggedMap = Object.fromEntries(
      timeSums.map((t) => [t.userId, (t._sum.durationMins || 0) / 60])
    );

    managementTasksReport = managementEmployeeTasks.map((t) => {
      const isCompleted = t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED;
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;
      const completedAt = t.completedAt ? new Date(t.completedAt) : (isCompleted ? new Date(t.updatedAt) : null);
      
      let isOverdue = false;
      let overdueDays = 0;
      
      if (dueDate) {
        if (isCompleted && completedAt && completedAt > dueDate) {
          isOverdue = true;
          const diffTime = Math.abs(completedAt.getTime() - dueDate.getTime());
          overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (!isCompleted && new Date() > dueDate) {
          isOverdue = true;
          const diffTime = Math.abs(new Date().getTime() - dueDate.getTime());
          overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      return {
        id: t.id,
        title: t.title,
        projectTitle: t.project?.title || "No Project",
        assigneeName: t.assignedTo?.name || "Unassigned",
        assigneeDept: t.assignedTo?.department || null,
        creatorName: t.assignedBy?.name || "System",
        creatorRole: t.assignedBy?.role || "SYSTEM",
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: completedAt,
        revisionCount: t.revisionCount,
        isOverdue,
        overdueDays,
      };
    });

    teamPerformanceReport = allUsersWithStats.map((u) => {
      const hoursLogged = hoursLoggedMap[u.id] || 0;
      
      if (u.role === Role.EMPLOYEE) {
        const assignedCount = u.assignedTasks.length;
        const completedCount = u.assignedTasks.filter(t => t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED).length;
        const ongoingCount = assignedCount - completedCount;
        const totalRevisions = u.assignedTasks.reduce((sum, t) => sum + t.revisionCount, 0);
        
        const doneProperlyCount = u.assignedTasks.filter(t => 
          (t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED) && t.revisionCount === 0
        ).length;
        const doneProperlyRate = completedCount > 0 ? Math.round((doneProperlyCount / completedCount) * 100) : 100;

        const overdueCount = u.assignedTasks.filter(t => {
          if (!t.dueDate) return false;
          const isCompleted = t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED;
          if (isCompleted) {
            return new Date(t.completedAt || t.dueDate) > new Date(t.dueDate);
          } else {
            return new Date() > new Date(t.dueDate);
          }
        }).length;
        const overdueRate = assignedCount > 0 ? Math.round((overdueCount / assignedCount) * 100) : 0;

        const taskDetails = u.assignedTasks.map(t => {
          const isDone = t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED;
          const isTaskOverdue = t.dueDate
            ? (isDone
                ? new Date(t.completedAt || t.dueDate) > new Date(t.dueDate)
                : new Date() > new Date(t.dueDate))
            : false;
          return {
            id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
            projectTitle: t.project?.title || "No Project",
            assignerName: t.assignedBy?.name || "Self",
            dueDate: t.dueDate, createdAt: t.createdAt,
            startedAt: t.startedAt, completedAt: t.completedAt,
            revisionCount: t.revisionCount, isOverdue: isTaskOverdue,
          };
        });

        return {
          id: u.id,
          name: u.name,
          role: u.role,
          department: u.department,
          type: "employee",
          ongoingCount,
          completedCount,
          totalRevisions,
          doneProperlyRate,
          overdueRate,
          hoursLogged,
          tasks: taskDetails,
        };
      } else {
        const projectsManaged = u.managedProjects.length;
        const tasksCreated = u.createdTasks.length;
        const reviewsPerformed = u.activities.filter(a => 
          a.action === "REVISION_REQUESTED" || 
          (a.action === "STATUS_CHANGED" && (a.metadata as any)?.newStatus === "CLIENT_APPROVAL")
        ).length;

        const assignedTaskDetails = u.assignedTasks.map(t => {
          const isDone = t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED;
          const isTaskOverdue = t.dueDate
            ? (isDone
                ? new Date(t.completedAt || t.dueDate) > new Date(t.dueDate)
                : new Date() > new Date(t.dueDate))
            : false;
          return {
            id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
            projectTitle: t.project?.title || "No Project",
            assignerName: t.assignedBy?.name || "Self",
            dueDate: t.dueDate, createdAt: t.createdAt,
            startedAt: t.startedAt, completedAt: t.completedAt,
            revisionCount: t.revisionCount, isOverdue: isTaskOverdue,
          };
        });

        const createdTaskDetails = u.createdTasks.map(t => {
          const isDone = t.status === TaskStatus.DONE || t.status === TaskStatus.APPROVED;
          const isTaskOverdue = t.dueDate
            ? (isDone
                ? new Date(t.completedAt || t.dueDate) > new Date(t.dueDate)
                : new Date() > new Date(t.dueDate))
            : false;
          return {
            id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
            projectTitle: t.project?.title || "No Project",
            assigneeName: t.assignedTo?.name || "Unassigned",
            dueDate: t.dueDate, createdAt: t.createdAt,
            startedAt: t.startedAt, completedAt: t.completedAt,
            revisionCount: t.revisionCount, isOverdue: isTaskOverdue,
          };
        });

        return {
          id: u.id,
          name: u.name,
          role: u.role,
          department: u.department,
          type: "manager",
          projectsManaged,
          tasksCreated,
          reviewsPerformed,
          hoursLogged,
          tasks: assignedTaskDetails,
          createdTasksList: createdTaskDetails,
        };
      }
    });
  }

  // Fetch activity logs for task lifecycle timeline (for Director reports)
  let taskActivityMap: Record<string, Array<{
    action: string;
    metadata: any;
    createdAt: Date;
    userName: string;
    userRole: string;
  }>> = {};

  if (userRole === Role.SUPER_ADMIN && teamPerformanceReport.length > 0) {
    // Collect all task IDs from team performance report
    const allTaskIds = new Set<string>();
    for (const person of teamPerformanceReport) {
      for (const task of (person.tasks || [])) {
        allTaskIds.add(task.id);
      }
      for (const task of (person.createdTasksList || [])) {
        allTaskIds.add(task.id);
      }
    }
    // Also from managementTasksReport
    for (const task of managementTasksReport) {
      allTaskIds.add(task.id);
    }

    if (allTaskIds.size > 0) {
      const taskActivities = await db.activityLog.findMany({
        where: {
          taskId: { in: Array.from(allTaskIds) },
          action: { in: ["STATUS_CHANGED", "APPROVED", "REVISION_REQUESTED", "CREATED", "ASSIGNED", "UPDATED"] },
        },
        select: {
          taskId: true,
          action: true,
          metadata: true,
          createdAt: true,
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by taskId
      for (const log of taskActivities) {
        if (!log.taskId) continue;
        if (!taskActivityMap[log.taskId]) {
          taskActivityMap[log.taskId] = [];
        }
        taskActivityMap[log.taskId].push({
          action: log.action,
          metadata: log.metadata,
          createdAt: log.createdAt,
          userName: log.user.name,
          userRole: log.user.role,
        });
      }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              REPORTS
            </h1>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-on-surface/50">
              ANALYTICS & PERFORMANCE METRICS
            </p>
          </div>
          <span className="material-symbols-outlined text-[28px] md:text-[36px] text-primary flex-shrink-0">analytics</span>
        </div>
      </div>

      <ReportsDashboard
        userRole={userRole}
        projectStatusCounts={projectStatusCounts}
        taskStatusCounts={taskStatusCounts}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        overdueTasks={overdueTasks}
        weeklyCompletions={weeklyCompletions}
        monthlyCompletions={monthlyCompletions}
        totalHoursThisWeek={Number(totalTimeThisWeek._sum?.durationMins || 0) / 60}
        teamPerformance={teamPerformance}
        projectProgress={projectProgress}
        recentActivity={recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          userName: a.user.name,
          taskTitle: a.task?.title || null,
          projectTitle: a.project?.title || null,
          createdAt: a.createdAt,
        }))}
        managementTasksReport={managementTasksReport}
        teamPerformanceReport={teamPerformanceReport}
        taskActivityMap={taskActivityMap}
      />
    </div>
  );
}
