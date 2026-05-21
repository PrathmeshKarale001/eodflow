"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { createProjectRecord, createProjectFileRecord } from "@/app/actions/create-project";
import { uploadFile } from "@/lib/storage-client";
import { Priority } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

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
  preselectedClientId?: string;
}

export function CreateProjectForm({ clients, managers, preselectedClientId }: CreateProjectFormProps) {
  const router = useRouter();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preselectedClient = preselectedClientId
    ? clients.find((c) => c.id === preselectedClientId)
    : null;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      priority: Priority.MEDIUM,
      clientId: preselectedClientId || "",
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
          const { url } = await uploadFile(file, `projects/${project.id}/${project.createdById}`);
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

      // 3. Redirect to project page
      router.push(`/projects/${project.id}`);
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to create project.", { duration: 5000 });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Row 1: Title (full width) */}
      <div className="space-y-1.5">
        <label className="font-label text-[9px] uppercase text-primary tracking-widest">
          PROJECT_TITLE
        </label>
        <input
          {...register("title")}
          autoFocus
          autoComplete="off"
          className="w-full h-12 bg-transparent brutalist-border px-4 py-2 font-body text-sm placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
          placeholder="E.G. Q3 CAMPAIGN ROLLOUT"
        />
        {errors.title && <p className="text-error text-[9px] font-mono uppercase">{errors.title.message}</p>}
      </div>

      {/* Row 2: 4-column grid — Client, Manager, Priority, Deadline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Client Binding */}
        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            CLIENT_BINDING
          </label>
          {preselectedClient ? (
            <>
              {/* Hidden value for form */}
              <input type="hidden" {...register("clientId")} />
              {/* Display-only locked chip */}
              <div className="h-11 w-full brutalist-border bg-primary/5 px-3 flex items-center gap-2 text-sm font-headline uppercase tracking-wide text-primary border-primary/30">
                <span className="material-symbols-outlined text-sm">lock</span>
                {preselectedClient.companyName}
              </div>
            </>
          ) : (
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <AppSelect
                  options={clients.map(c => ({ value: c.id, label: c.companyName }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="— SELECT CLIENT —"
                  className="h-11"
                />
              )}
            />
          )}
          {errors.clientId && <p className="text-error text-[9px] font-mono uppercase">{errors.clientId.message}</p>}
        </div>

        {/* Assigned Manager */}
        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            ASSIGNED_MANAGER
          </label>
          <Controller
            name="assignedManagerId"
            control={control}
            render={({ field }) => (
              <AppSelect
                options={managers.map(m => ({ value: m.id, label: m.name }))}
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="— UNASSIGNED —"
                className="h-11"
              />
            )}
          />
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            PRIORITY
          </label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <AppSelect
                options={Object.values(Priority).map(p => ({ value: p, label: p }))}
                value={field.value}
                onChange={field.onChange}
                placeholder=""
                className="h-11"
              />
            )}
          />
        </div>

        {/* Deadline */}
        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            DEADLINE
          </label>
          <input
            type="datetime-local"
            {...register("deadline")}
            className="w-full h-11 bg-[var(--clr-surface-low)] brutalist-border px-3 font-mono text-[10px] uppercase tracking-widest focus:border-primary-container focus:outline-none"
          />
        </div>
      </div>

      {/* Row 3: Brief Objective + Deliverables side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            BRIEF_OBJECTIVE
          </label>
          <textarea
            {...register("briefObjective")}
            rows={3}
            className="w-full bg-transparent brutalist-border px-3 py-2 font-body text-sm placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
            placeholder="WHAT IS THE PRIMARY GOAL?"
          />
          {errors.briefObjective && <p className="text-error text-[9px] font-mono uppercase">{errors.briefObjective.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            DELIVERABLES
          </label>
          <textarea
            {...register("briefDeliverables")}
            rows={3}
            className="w-full bg-transparent brutalist-border px-3 py-2 font-body text-sm placeholder:text-muted focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
            placeholder="WHAT EXACTLY IS BEING DELIVERED?"
          />
        </div>
      </div>

      {/* Row 4: Attachments */}
      <div className="space-y-1.5">
        <label className="font-label text-[9px] uppercase text-primary tracking-widest">
          BRIEF_ATTACHMENTS
        </label>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`brutalist-border border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
            ${isDragging ? "bg-primary/10 border-primary" : "bg-card-muted hover:bg-neutral-200"}
          `}
        >
          <input
            type="file"
            multiple
            onChange={onManualFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span className="material-symbols-outlined text-2xl mb-1 text-muted-foreground">
            attach_file
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-card-text">
            DROP FILES OR CLICK TO UPLOAD
          </span>
        </div>

        {attachments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 brutalist-border bg-card text-xs font-mono uppercase">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-sm">draft</span>
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

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 mono-clip bg-[#180065] text-white px-6 py-4 font-headline text-sm uppercase shadow-[4px_4px_0px_#5847d2] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#5847d2] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "TRANSMITTING..." : "GENERATE_PROJECT_RECORD"}
        {!isSubmitting && <span className="material-symbols-outlined text-sm">send</span>}
      </button>
    </form>
  );
}
