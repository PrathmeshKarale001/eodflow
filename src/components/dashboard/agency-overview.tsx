import { TaskStatus } from "@prisma/client";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BACKLOG: { label: "BACKLOG", color: "bg-neutral-300" },
  TODO: { label: "TODO", color: "bg-blue-400" },
  IN_PROGRESS: { label: "IN_PROG", color: "bg-amber-400" },
  IN_REVIEW: { label: "REVIEW", color: "bg-purple-400" },
  REVISION: { label: "REVISION", color: "bg-red-400" },
  CLIENT_APPROVAL: { label: "CLIENT", color: "bg-indigo-400" },
  CLIENT_REVISION: { label: "C_REV", color: "bg-orange-400" },
  APPROVED: { label: "APPROVED", color: "bg-green-400" },
  DONE: { label: "DONE", color: "bg-green-600" },
};

interface AgencyOverviewProps {
  statusCounts: Record<string, number>;
  totalTasks: number;
}

export function AgencyOverview({ statusCounts, totalTasks }: AgencyOverviewProps) {
  const statuses = Object.values(TaskStatus);

  return (
    <div className="brutalist-border bg-white p-5">
      <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-[#180065] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">bar_chart</span>
        TASK_DISTRIBUTION
      </h3>

      {/* CSS-only horizontal bar chart */}
      <div className="space-y-2">
        {statuses.map((status) => {
          const count = statusCounts[status] || 0;
          const config = STATUS_CONFIG[status] || { label: status, color: "bg-neutral-400" };
          const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;

          return (
            <div key={status} className="flex items-center gap-3">
              <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground w-16 text-right flex-shrink-0">
                {config.label}
              </span>
              <div className="flex-1 h-5 bg-[#F4F4F5] brutalist-border overflow-hidden">
                <div
                  className={`h-full ${config.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] w-8 text-right font-bold">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
