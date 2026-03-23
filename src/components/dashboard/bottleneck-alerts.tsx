import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";

const ACTION_DOTS: Record<string, string> = {
  CREATED: "bg-blue-500",
  UPDATED: "bg-amber-500",
  STATUS_CHANGED: "bg-purple-500",
  APPROVED: "bg-green-500",
  REVISION_REQUESTED: "bg-red-500",
  TIME_LOGGED: "bg-cyan-500",
  FILE_UPLOADED: "bg-indigo-500",
  COMMENTED: "bg-teal-500",
};

interface BottleneckAlertsProps {
  bottleneckTasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    updatedAt: Date;
    assignedTo: { name: string } | null;
    project: { title: string };
  }>;
  activities: Array<{
    id: string;
    action: string;
    createdAt: Date;
    user: { name: string };
    task: { title: string } | null;
  }>;
}

export function BottleneckAlerts({ bottleneckTasks, activities }: BottleneckAlertsProps) {
  const now = new Date();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bottleneck Alerts */}
      <div className="brutalist-border bg-white">
        <div className="px-5 py-3 border-b-2 border-black bg-[#F4F4F5] flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-amber-600">warning</span>
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-[#180065]">BOTTLENECK_ALERTS</h3>
          <span className="ml-auto bg-amber-500 text-white px-2 py-0.5 text-[9px] font-mono">
            {bottleneckTasks.length}
          </span>
        </div>

        <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
          {bottleneckTasks.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-3xl text-green-400 mb-2 block">check_circle</span>
              <p className="font-mono text-xs uppercase tracking-widest text-green-600">ALL_CLEAR</p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1">No bottlenecks detected</p>
            </div>
          ) : (
            bottleneckTasks.map((task) => {
              const stuckHours = Math.round((now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60));
              const severity = stuckHours > 48 ? "border-l-red-500 bg-red-50" : "border-l-amber-400 bg-amber-50";

              return (
                <div key={task.id} className={`px-4 py-3 border-l-4 ${severity}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-headline text-xs uppercase tracking-tight truncate max-w-[200px]">
                      {task.title}
                    </span>
                    <span className={`font-mono text-[9px] uppercase px-2 py-0.5 ${stuckHours > 48 ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                      {stuckHours}H STUCK
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-mono uppercase text-muted-foreground">
                    <span>{task.status.replace(/_/g, " ")}</span>
                    <span>•</span>
                    <span>{task.assignedTo?.name || "UNASSIGNED"}</span>
                    <span>•</span>
                    <span>{task.project.title}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="brutalist-border bg-white">
        <div className="px-5 py-3 border-b-2 border-black bg-[#F4F4F5] flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-[#180065]">history</span>
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-[#180065]">ACTIVITY_FEED</h3>
        </div>

        <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto" style={{ contentVisibility: "auto" }}>
          {activities.map((activity) => {
            const dotColor = ACTION_DOTS[activity.action] || "bg-neutral-400";
            const timeAgo = formatTimeAgo(activity.createdAt);

            return (
              <div key={activity.id} className="px-4 py-2 flex items-center gap-3 hover:bg-neutral-50 transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest">
                    <span className="font-bold text-[#180065]">{activity.user.name}</span>
                    <span className="text-muted-foreground"> {activity.action.replace(/_/g, " ")}</span>
                    {activity.task ? (
                      <span className="text-muted-foreground"> — {activity.task.title}</span>
                    ) : null}
                  </span>
                </div>
                <span className="font-mono text-[8px] text-muted-foreground flex-shrink-0">{timeAgo}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
