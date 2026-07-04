"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateTask } from "@/app/actions/tasks";
import { Priority, TaskStatus, Role } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

const taskSchema = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
  assignedToId: z.string().optional(),
  assignedById: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  selectedProjectId: z.string().min(1, "Project is required"),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskModalProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: Priority;
    assignedToId: string | null;
    assignedById?: string | null;
    dueDate: Date | null;
    status: TaskStatus;
    projectId: string | null;
  };
  projects?: Array<{ id: string; title: string; clientId?: string | null }>;
  brands?: Array<{ id: string; companyName: string }>;
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
  userRole?: Role;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = Object.values(Priority).map((p) => ({ value: p, label: p }));
const ALL_STATUS_OPTIONS = Object.values(TaskStatus).map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

// Employees can only transition to these statuses — DONE/APPROVED are manager-only
const EMPLOYEE_ALLOWED_STATUSES: Set<TaskStatus> = new Set([
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.BACKLOG,
  TaskStatus.PENDING_APPROVAL,
]);

export function EditTaskModal({ task, projects = [], brands = [], teamMembers = [], userRole, userId, isOpen, onClose }: EditTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive initial brand from the task's current project
  const initialBrandId = useMemo(() => {
    if (task.projectId && projects.length > 0) {
      const currentProject = projects.find((p) => p.id === task.projectId);
      return currentProject?.clientId || "";
    }
    return "";
  }, [task.projectId, projects]);

  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId);
  const [brandError, setBrandError] = useState("");

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const isDirector = userRole === Role.SUPER_ADMIN;
  const isEmployee = userRole === Role.EMPLOYEE;

  // Self-task: employee created/assigned the task to themselves
  const isSelfTask = isEmployee && (
    (task.assignedById && userId && task.assignedById === userId) ||
    (task.assignedToId && task.assignedById && task.assignedToId === task.assignedById)
  );

  // Employees see restricted status options ONLY for manager-assigned tasks.
  // Self-tasks get full status control (employee can mark DONE, etc.)
  const statusOptions = isEmployee && !isSelfTask
    ? ALL_STATUS_OPTIONS.filter((s) => EMPLOYEE_ALLOWED_STATUSES.has(s.value as TaskStatus))
    : ALL_STATUS_OPTIONS;

  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignedToId: task.assignedToId || "",
      assignedById: task.assignedById || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      status: task.status,
      selectedProjectId: task.projectId || "",
    },
  });

  // Re-sync form when task changes
  useEffect(() => {
    if (isOpen && task) {
      reset({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        assignedToId: task.assignedToId || "",
        assignedById: task.assignedById || "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
        status: task.status,
        selectedProjectId: task.projectId || "",
      });
      // Re-derive brand from project
      if (task.projectId && projects.length > 0) {
        const currentProject = projects.find((p) => p.id === task.projectId);
        setSelectedBrandId(currentProject?.clientId || "");
      } else {
        setSelectedBrandId("");
      }
      setBrandError("");
    }
  }, [isOpen, task, reset, projects]);

  // Filter projects by selected brand
  const filteredProjects = useMemo(() => {
    if (!selectedBrandId) return projects;
    return projects.filter((p) => p.clientId === selectedBrandId);
  }, [projects, selectedBrandId]);

  const projectOptions = filteredProjects.map((p) => ({ value: p.id, label: p.title }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.companyName }));

  if (!isOpen) return null;

  const memberOptions = teamMembers.map((m) => ({
    value: m.id,
    label: `${m.name}${m.department ? ` (${m.department})` : ""}`,
  }));

  const onSubmit = async (data: TaskFormValues) => {
    // Validate brand is selected
    if (brands.length > 0 && !selectedBrandId) {
      setBrandError("Brand is required");
      return;
    }
    setBrandError("");

    setIsSubmitting(true);
    try {
      await updateTask(task.id, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedToId: data.assignedToId || undefined,
        assignedById: isDirector ? (data.assignedById || undefined) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: data.status,
        projectId: data.selectedProjectId || undefined,
      });
      onClose();
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to update task.", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="brutalist-border bg-card w-full sm:max-w-lg sm:mx-4 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 sm:rounded-lg flex flex-col max-h-full sm:max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-[#180065] text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          <h2 className="font-headline text-base uppercase tracking-widest relative z-10">Edit Task</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-sm">Close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3.5 overflow-y-auto flex-1 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">

          {/* Brand + Project Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Brand Selector */}
            {brands.length > 0 && (
              <div className="space-y-1">
                <label className="font-label text-[11px] uppercase text-primary tracking-widest">Brand <span className="text-red-500">*</span></label>
                <AppSelect
                  options={brandOptions}
                  value={selectedBrandId}
                  onChange={(val) => {
                    setSelectedBrandId(val);
                    setBrandError("");
                    // Reset project when brand changes
                    setValue("selectedProjectId", "");
                  }}
                  placeholder="— Select Brand —"
                />
                {brandError && <p className="text-red-500 text-[11px] font-mono uppercase">{brandError}</p>}
              </div>
            )}

            {/* Project Selector */}
            <div className="space-y-1">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">Project <span className="text-red-500">*</span></label>
              <Controller
                name="selectedProjectId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={projectOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="— Select Project —"
                  />
                )}
              />
              {errors.selectedProjectId && <p className="text-red-500 text-[11px] font-mono uppercase">{errors.selectedProjectId.message}</p>}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="font-label text-[11px] uppercase text-primary tracking-widest">Task Title</label>
            <input
              {...register("title")}
              className="w-full h-10 bg-transparent brutalist-border px-3 py-2 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
              placeholder="E.G. DESIGN SOCIAL MEDIA CAROUSEL"
            />
            {errors.title && <p className="text-red-500 text-[11px] font-mono uppercase">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-label text-[11px] uppercase text-primary tracking-widest">Description</label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full bg-transparent brutalist-border px-3 py-2 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
              placeholder="Task details..."
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">Priority</label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={PRIORITY_OPTIONS}
                    value={field.value}
                    onChange={(val) => field.onChange(val as Priority)}
                    placeholder=""
                    className="h-11"
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">Due Date & Time</label>
              <input
                type="datetime-local"
                {...register("dueDate")}
                className="w-full h-11 bg-[var(--clr-surface-low)] brutalist-border px-3 font-mono text-[10px] uppercase tracking-widest focus:border-primary-container focus:outline-none"
              />
            </div>
          </div>

          {/* Status + Assign To */}
          <div className={`grid grid-cols-1 ${!isEmployee ? 'sm:grid-cols-2' : ''} gap-4 sm:gap-3`}>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">Status</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={statusOptions}
                    value={field.value}
                    onChange={(val) => field.onChange(val as TaskStatus)}
                    placeholder=""
                    className="h-11"
                  />
                )}
              />
            </div>

            {/* Assign To — hidden for employees (they can't assign to managers) */}
            {!isEmployee && (
              <div className="space-y-1.5">
                <label className="font-label text-[11px] uppercase text-primary tracking-widest">Assign To</label>
                <Controller
                  name="assignedToId"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      options={memberOptions}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="— Unassigned —"
                      className="h-11"
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Assigned By — Director only */}
          {isDirector && (
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">
                Assigned By <span className="text-error/60">(Director Only)</span>
              </label>
              <Controller
                name="assignedById"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={memberOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="— Select Assigner —"
                    className="h-11"
                  />
                )}
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2 brutalist-border border-b-0 border-x-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 brutalist-border py-2.5 font-headline text-xs uppercase tracking-widest text-outline hover:bg-card/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-primary-container text-white py-2.5 font-headline text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
