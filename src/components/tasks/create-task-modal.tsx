"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createTask } from "@/app/actions/tasks";
import { Priority } from "@prisma/client";

const taskSchema = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  projectId: string;
  teamMembers: Array<{ id: string; name: string; department: string | null }>;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ projectId, teamMembers, isOpen, onClose }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: Priority.MEDIUM },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    try {
      await createTask({
        projectId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedToId: data.assignedToId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="brutalist-border bg-white w-full max-w-lg mx-4 shadow-[8px_8px_0px_#180065] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-6 border-b-2 border-black flex items-center justify-between bg-[#180065] text-white relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
          <h2 className="font-headline text-lg uppercase tracking-widest relative z-10">CREATE_TASK</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase text-primary tracking-widest">TASK_TITLE</label>
            <input
              {...register("title")}
              autoFocus
              className="w-full h-12 bg-transparent brutalist-border px-4 py-3 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-white/5 transition-colors uppercase"
              placeholder="E.G. DESIGN SOCIAL MEDIA CAROUSEL"
            />
            {errors.title ? <p className="text-red-600 text-[10px] font-mono uppercase">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase text-primary tracking-widest">DESCRIPTION</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full bg-transparent brutalist-border px-4 py-3 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-white/5 transition-colors resize-none"
              placeholder="Task details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label text-[10px] uppercase text-primary tracking-widest">PRIORITY</label>
              <select
                {...register("priority")}
                className="w-full h-12 bg-transparent brutalist-border px-4 font-body text-sm focus:border-primary-container focus:outline-none appearance-none rounded-none uppercase"
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-label text-[10px] uppercase text-primary tracking-widest">DUE_DATE</label>
              <input
                type="date"
                {...register("dueDate")}
                className="w-full h-12 bg-transparent brutalist-border px-4 font-body text-sm focus:border-primary-container focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase text-primary tracking-widest">ASSIGN_TO</label>
            <select
              {...register("assignedToId")}
              className="w-full h-12 bg-transparent brutalist-border px-4 font-body text-sm focus:border-primary-container focus:outline-none appearance-none rounded-none uppercase"
            >
              <option value="">-- UNASSIGNED --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.department ? ` (${m.department})` : ""}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 mono-clip bg-[#180065] text-white px-6 py-4 font-headline text-sm uppercase shadow-[4px_4px_0px_#5847d2] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#5847d2] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isSubmitting ? "TRANSMITTING..." : "DEPLOY_TASK"}
            {!isSubmitting ? <span className="material-symbols-outlined text-base">add_task</span> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
