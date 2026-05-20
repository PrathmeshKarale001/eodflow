import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";
import { CalendarView } from "@/components/calendar/calendar-view";
import Link from "next/link";

// Page rendering can be optimized by Next.js

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;

  // Fetch 3 months of tasks with dueDates (past month + current + next)
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setMonth(to.getMonth() + 2);
  to.setDate(0);
  to.setHours(23, 59, 59, 999);

  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";

  const tasks = await db.task.findMany({
    where: {
      dueDate: { gte: from, lte: to },
      status: { not: TaskStatus.APPROVED },
      // Employees see only their own tasks
      ...(isAdmin ? {} : { assignedToId: userId }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      assignedToId: true,
      project: { select: { title: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="brutalist-border bg-[#180065] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase">
              CALENDAR
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mt-1">
              TASK_DEADLINES // MONTHLY_VIEW
            </p>
          </div>
          <span className="material-symbols-outlined text-[40px] text-on-surface/30">calendar_month</span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "DUE_THIS_WEEK",
            value: tasks.filter((t) => {
              const diff = Math.ceil((new Date(t.dueDate!).getTime() - Date.now()) / 86400000);
              return diff >= 0 && diff <= 7;
            }).length,
            color: "border-t-amber-500",
            icon: "event_upcoming",
            href: "/calendar",
          },
          {
            label: "OVERDUE",
            value: tasks.filter((t) => new Date(t.dueDate!).getTime() < Date.now() && !["DONE", "APPROVED"].includes(t.status)).length,
            color: "border-t-red-500",
            icon: "warning",
            href: "/tasks",
          },
          {
            label: "COMPLETED",
            value: tasks.filter((t) => t.status === "DONE").length,
            color: "border-t-green-500",
            icon: "check_circle",
            href: "/tasks",
          },
        ].map((k) => (
          <Link key={k.label} href={k.href} className={`brutalist-border bg-card p-4 border-t-4 ${k.color} hover:bg-card/80 transition-colors group block`}>
            <span className="material-symbols-outlined text-lg text-on-surface/40">{k.icon}</span>
            <p className="font-mono text-3xl font-bold text-on-surface mt-2 group-hover:text-primary transition-colors">{k.value}</p>
            <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/50 mt-1">{k.label}</p>
          </Link>
        ))}
      </div>

      <CalendarView
        tasks={tasks as any}
        userId={userId}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
