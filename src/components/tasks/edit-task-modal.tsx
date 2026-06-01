"use client";

import { useState, useEffect } from "react";
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
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
  userRole?: Role;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = Object.values(Priority).map((p) => ({ value: p, label: p }));
const STATUS_OPTIONS = Object.values(TaskStatus).map((s) => ({ value: s, label: s }));

export function EditTaskModal({ task, teamMembers = [], userRole, isOpen, onClose }: EditTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirector = userRole === Role.SUPER_ADMIN;

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignedToId: task.assignedToId || "",
      assignedById: task.assignedById || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      status: task.status,
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
      });
    }
  }, [isOpen, task, reset]);

  if (!isOpen) return null;

  const memberOptions = teamMembers.map((m) => ({
    value: m.id,
    label: `${m.name}${m.department ? ` (${m.department})` : ""}`,
  }));

  const onSubmit = async (data: TaskFormValues) => {
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
      });
      onClose();
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to update task.", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="brutalist-border bg-card w-full max-w-lg mx-4 shadow-[4px_4px_0px_#180065] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-[#180065] text-white relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          <h2 className="font-headline text-base uppercase tracking-widest relative z-10">EDIT_TASK</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3.5">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">TASK_TITLE</label>
            <input
              {...register("title")}
              className="w-full h-10 bg-transparent brutalist-border px-3 py-2 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
              placeholder="E.G. DESIGN SOCIAL MEDIA CAROUSEL"
            />
            {errors.title && <p className="text-red-500 text-[9px] font-mono uppercase">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">DESCRIPTION</label>
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
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">PRIORITY</label>
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
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">DUE_DATE_TIME</label>
              <input
                type="datetime-local"
                {...register("dueDate")}
                className="w-full h-11 bg-[var(--clr-surface-low)] brutalist-border px-3 font-mono text-[10px] uppercase tracking-widest focus:border-primary-container focus:outline-none"
              />
            </div>
          </div>

          {/* Status + Assign To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
            <div className="space-y-1.5">
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">STATUS</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={STATUS_OPTIONS}
                    value={field.value}
                    onChange={(val) => field.onChange(val as TaskStatus)}
                    placeholder=""
                    className="h-11"
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">ASSIGN_TO</label>
              <Controller
                name="assignedToId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={memberOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="— UNASSIGNED —"
                    className="h-11"
                  />
                )}
              />
            </div>
          </div>

          {/* Assigned By — Director only */}
          {isDirector && (
            <div className="space-y-1.5">
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">
                ASSIGNED_BY <span className="text-error/60">(DIRECTOR_ONLY)</span>
              </label>
              <Controller
                name="assignedById"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={memberOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="— SELECT ASSIGNER —"
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
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 mono-clip bg-primary-container text-white py-2.5 font-headline text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {isSubmitting ? "SAVING..." : "SAVE_CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
