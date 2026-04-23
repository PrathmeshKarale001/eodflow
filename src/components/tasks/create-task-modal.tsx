"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createTask } from "@/app/actions/tasks";
import { Priority } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

const taskSchema = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  projectId?: string;
  projects?: Array<{ id: string; title: string }>;
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (taskId: string) => void;
}

const PRIORITY_OPTIONS = Object.values(Priority).map((p) => ({ value: p, label: p }));

export function CreateTaskModal({ projectId, projects = [], teamMembers = [], isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<TaskFormValues & { selectedProjectId?: string }>({
    resolver: zodResolver(taskSchema.extend({
      selectedProjectId: z.string().optional().refine((val) => projectId || val, "Project is required"),
    })),
    defaultValues: {
      priority: Priority.MEDIUM,
      selectedProjectId: projectId || "",
    },
  });

  if (!isOpen) return null;

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.title }));
  const memberOptions = teamMembers.map((m) => ({
    value: m.id,
    label: `${m.name}${m.department ? ` (${m.department})` : ""}`,
  }));

  const onSubmit = async (data: TaskFormValues & { selectedProjectId?: string }) => {
    const targetProjectId = projectId || data.selectedProjectId;
    if (!targetProjectId) return;

    setIsSubmitting(true);
    try {
      const task = await createTask({
        projectId: targetProjectId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedToId: data.assignedToId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      reset();
      onClose();
      onSuccess?.(task.id);
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to create task.", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="brutalist-border bg-card w-full max-w-lg mx-4 shadow-[4px_4px_0px_#180065] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-[#180065] text-white relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          <h2 className="font-headline text-base uppercase tracking-widest relative z-10">CREATE_TASK</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3.5">

          {/* Project Selector */}
          {!projectId && (
            <div className="space-y-1">
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">SELECT_PROJECT</label>
              <Controller
                name="selectedProjectId"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    options={projectOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="— SELECT PROJECT —"
                  />
                )}
              />
              {errors.selectedProjectId && (
                <p className="text-red-500 text-[9px] font-mono uppercase">{errors.selectedProjectId.message as string}</p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">TASK_TITLE</label>
            <input
              {...register("title")}
              autoFocus
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
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">DUE_DATE</label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full h-11 bg-[var(--clr-surface-low)] brutalist-border px-3 font-mono text-[10px] uppercase tracking-widest focus:border-primary-container focus:outline-none"
              />
            </div>
          </div>

          {/* Assign To */}
          <div className="space-y-1">
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
                />
              )}
            />
          </div>

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
              <span className="material-symbols-outlined text-sm">add_task</span>
              {isSubmitting ? "CREATING..." : "CREATE_TASK"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
