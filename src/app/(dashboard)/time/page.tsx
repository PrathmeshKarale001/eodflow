import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyTimeEntries, getTeamTimeEntries, getRunningTimer, getMyAssignedTasks } from "@/app/actions/time";
import { TimeTrackerWidget } from "@/components/time/time-tracker-widget";
import { ManualTimeForm } from "@/components/time/manual-time-form";
import { TimeLogTable } from "@/components/time/time-log-table";

export const dynamic = "force-dynamic";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role ?? "");

  const [myEntries, runningTimer, myTasks] = await Promise.all([
    getMyTimeEntries(7),
    getRunningTimer(),
    getMyAssignedTasks(),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-[#180065] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase">
              TIME_TRACKER
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mt-1">
              TRACK_HOURS // LOG_WHAT_YOU_WORKED_ON
            </p>
          </div>
          <span className="material-symbols-outlined text-[40px] text-on-surface/30">timer</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Live Timer */}
          <div>
            <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/40 mb-2">
              LIVE_TIMER
            </p>
            <TimeTrackerWidget
              initialRunningTimer={runningTimer as any}
              tasks={myTasks as any}
            />
            {!runningTimer && myTasks.length === 0 && (
              <p className="font-mono text-[8px] text-on-surface/30 mt-2 text-center uppercase">
                No active tasks assigned to you
              </p>
            )}
          </div>

          {/* Manual Entry */}
          <ManualTimeForm tasks={myTasks as any} />
        </div>

        {/* Right: My Time Log */}
        <div className="lg:col-span-2 space-y-3">
          {/* Range header */}
          <div className="flex items-center justify-between">
            <p className="font-headline text-xs uppercase tracking-widest text-on-surface/60">
              MY_TIME_LOG // LAST_7_DAYS
            </p>
          </div>

          <TimeLogTable entries={myEntries as any} />

          {/* Team log (admin only) */}
          {isAdmin && (
            <div className="mt-8 space-y-3">
              <div className="brutalist-border border-b-0 border-x-0 pt-4">
                <p className="font-headline text-xs uppercase tracking-widest text-on-surface/60 pb-3">
                  TEAM_LOG // LAST_7_DAYS
                </p>
              </div>
              <TeamTimeLog />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Async sub-component for team log
async function TeamTimeLog() {
  const entries = await getTeamTimeEntries(7);

  return (
    <TimeLogTable
      entries={entries as any}
      showUser
    />
  );
}
