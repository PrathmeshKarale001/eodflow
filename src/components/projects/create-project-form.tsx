"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { createProjectRecord, createProjectFileRecord } from "@/app/actions/create-project";
import { uploadFile } from "@/lib/storage";
import { Priority } from "@prisma/client";

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  clientId: z.string().min(1, "Client is required"),
  assignedManagerId: z.string().optional(),
  priority: z.nativeEnum(Priority),
  deadline: z.string().optional(),
  briefObjective: z.string().min(10, "Brief objective must be at least 10 characters"),
  briefDeliverables: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface CreateProjectFormProps {
  clients: { id: string; companyName: string }[];
  managers: { id: string; name: string; email: string }[];
}

export function CreateProjectForm({ clients, managers }: CreateProjectFormProps) {
  const router = useRouter();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      priority: Priority.MEDIUM,
    },
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setAttachments((prev) => [...prev, ...droppedFiles]);
  }, []);

  const onManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...selected]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Create DB Project Record (createdById pulled from server session)
      const project = await createProjectRecord({
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      });

      // 2. Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const { url } = await uploadFile(file, `projects/${project.id}`);
          await createProjectFileRecord({
            projectId: project.id,
            uploadedById: project.createdById,
            filename: file.name,
            originalName: file.name,
            fileUrl: url,
            mimeType: file.type,
            fileSize: file.size,
          });
        }
      }

      // 3. Redirect to dashboard or project page
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to create project.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="space-y-2 md:col-span-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            PROJECT_TITLE
          </label>
          <input
            {...register("title")}
            autoFocus
            autoComplete="off"
            className="w-full h-14 bg-transparent brutalist-border px-4 py-3 font-body text-base placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
            placeholder="E.G. Q3 CAMPAIGN ROLLOUT"
          />
          {errors.title && <p className="text-error text-xs font-mono uppercase mt-1">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            CLIENT_BINDING
          </label>
          <div className="relative">
            <select
              {...register("clientId")}
              className="w-full h-14 bg-card text-card-text brutalist-border px-4 py-3 font-body text-base focus:border-primary-container focus:outline-none transition-colors uppercase appearance-none cursor-pointer"
            >
              <option value="" className="bg-card text-on-surface/50">-- SELECT CLIENT --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-card text-card-text">{c.companyName}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-primary">expand_more</span>
          </div>
          {errors.clientId && <p className="text-error text-xs font-mono uppercase mt-1">{errors.clientId.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            ASSIGNED_MANAGER
          </label>
          <div className="relative">
            <select
              {...register("assignedManagerId")}
              className="w-full h-14 bg-card text-card-text brutalist-border px-4 py-3 font-body text-base focus:border-primary-container focus:outline-none transition-colors uppercase appearance-none cursor-pointer"
            >
              <option value="" className="bg-card text-on-surface/50">-- UNASSIGNED --</option>
              {managers.map(m => (
                <option key={m.id} value={m.id} className="bg-card text-card-text">{m.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-primary">expand_more</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            PRIORITY_LEVEL
          </label>
          <div className="relative">
            <select
              {...register("priority")}
              className="w-full h-14 bg-card text-card-text brutalist-border px-4 py-3 font-body text-base focus:border-primary-container focus:outline-none transition-colors uppercase appearance-none cursor-pointer"
            >
              {Object.values(Priority).map(p => (
                <option key={p} value={p} className="bg-card text-card-text">{p}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-primary">expand_more</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            DEADLINE
          </label>
          <input
            type="date"
            {...register("deadline")}
            className="w-full h-14 bg-transparent brutalist-border px-4 py-3 font-body text-base focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            BRIEF_OBJECTIVE
          </label>
          <textarea
            {...register("briefObjective")}
            rows={4}
            className="w-full bg-transparent brutalist-border px-4 py-3 font-body text-base placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
            placeholder="WHAT IS THE PRIMARY GOAL?"
          />
          {errors.briefObjective && <p className="text-error text-xs font-mono uppercase mt-1">{errors.briefObjective.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest">
            DELIVERABLES
          </label>
          <textarea
            {...register("briefDeliverables")}
            rows={3}
            className="w-full bg-transparent brutalist-border px-4 py-3 font-body text-base placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
            placeholder="WHAT EXACTLY IS BEING DELIVERED?"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-label text-[10px] uppercase text-primary tracking-widest mb-2 block">
            BRIEF_ATTACHMENTS
          </label>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`brutalist-border border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
              ${isDragging ? "bg-primary/10 border-primary" : "bg-card-muted hover:bg-neutral-200"}
            `}
          >
            <input 
              type="file" 
              multiple 
              onChange={onManualFileSelect} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-3xl mb-2 text-muted-foreground">
              attach_file
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-card-text">
              DROP FILES OR CLICK TO UPLOAD
            </span>
          </div>
          
          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 brutalist-border bg-card text-xs font-mono uppercase">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-base">draft</span>
                    <span className="truncate max-w-[200px] md:max-w-md">{file.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeAttachment(idx)}
                    className="text-error hover:text-red-700 font-bold"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 mono-clip bg-[#180065] text-white px-8 py-5 font-headline text-lg uppercase shadow-[6px_6px_0px_#5847d2] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_#5847d2] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "TRANSMITTING..." : "GENERATE_PROJECT_RECORD"}
        {!isSubmitting && <span className="material-symbols-outlined">send</span>}
      </button>
    </form>
  );
}
