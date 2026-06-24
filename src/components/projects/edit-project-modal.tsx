"use client";

import { useState, useTransition } from "react";
import { updateProject } from "@/app/actions/projects";
import { Priority, ProjectStatus } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

interface EditProjectModalProps {
  project: {
    id: string;
    title: string;
    priority: Priority;
    status: ProjectStatus;
    deadline: Date | null;
    briefObjective: string | null;
    briefDeliverables: string | null;
    assignedManagerId: string | null;
  };
  managers: { id: string; name: string }[];
  onClose: () => void;
}

const PRIORITY_OPTIONS = Object.values(Priority).map((p) => ({ value: p, label: p }));
const STATUS_OPTIONS = Object.values(ProjectStatus).map((s) => ({ value: s, label: s }));

export function EditProjectModal({ project, managers, onClose }: EditProjectModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(project.title);
  const [priority, setPriority] = useState<Priority>(project.priority);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [deadline, setDeadline] = useState(
    project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : ""
  );
  const [briefObjective, setBriefObjective] = useState(project.briefObjective || "");
  const [briefDeliverables, setBriefDeliverables] = useState(project.briefDeliverables || "");
  const [assignedManagerId, setAssignedManagerId] = useState(project.assignedManagerId || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    startTransition(async () => {
      try {
        await updateProject(project.id, {
          title: title.trim(),
          priority,
          status,
          deadline: deadline || undefined,
          briefObjective: briefObjective.trim() || undefined,
          briefDeliverables: briefDeliverables.trim() || undefined,
          assignedManagerId: assignedManagerId || undefined,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update project.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl brutalist-border bg-surface-container animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-on-surface/10 flex-shrink-0">
          <div>
            <h2 className="font-headline text-base uppercase tracking-tight text-on-surface">
              Edit Project
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface/40 mt-0.5">
              {project.id.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 brutalist-border flex items-center justify-center text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="brutalist-border bg-error/10 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-error">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20 uppercase"
            />
          </div>

          {/* Priority + Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
                Priority
              </label>
              <AppSelect
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                placeholder=""
                className="h-11"
              />
            </div>
            <div>
              <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
                Status
              </label>
              <AppSelect
                options={STATUS_OPTIONS}
                value={status}
                onChange={(val) => setStatus(val as ProjectStatus)}
                placeholder=""
                className="h-11"
              />
            </div>
          </div>

          {/* Deadline + Manager Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none h-11"
              />
            </div>
            <div>
              <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
                Assigned Manager
              </label>
              <AppSelect
                options={[
                  { value: "", label: "-- Unassigned --" },
                  ...managers.map((m) => ({ value: m.id, label: m.name })),
                ]}
                value={assignedManagerId}
                onChange={(val) => setAssignedManagerId(val)}
                placeholder="-- Unassigned --"
                className="h-11"
              />
            </div>
          </div>

          {/* Brief Objective */}
          <div>
            <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
              Brief Objective
            </label>
            <textarea
              value={briefObjective}
              onChange={(e) => setBriefObjective(e.target.value)}
              rows={3}
              className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20 resize-none"
              placeholder="Primary goal..."
            />
          </div>

          {/* Deliverables */}
          <div>
            <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
              Deliverables
            </label>
            <textarea
              value={briefDeliverables}
              onChange={(e) => setBriefDeliverables(e.target.value)}
              rows={3}
              className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20 resize-none"
              placeholder="What exactly is being delivered..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary-container text-white px-6 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="brutalist-border px-5 py-3 font-headline text-xs uppercase text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
