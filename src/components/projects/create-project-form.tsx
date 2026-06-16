"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { createProjectRecord, createProjectFileRecord } from "@/app/actions/create-project";
import { createTask } from "@/app/actions/tasks";
import { uploadFile } from "@/lib/storage-client";
import { Priority } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";
import { usePermissions } from "@/hooks/use-permissions";

const formSchemaBase = z.object({
  // Project fields
  title: z.string().min(3, "Title must be at least 3 characters"),
  clientId: z.string().min(1, "Client is required"),
  // First task fields (all optional — task section is opt-in)
  taskTitle: z.string().optional(),
  taskDescription: z.string().optional(),
  taskPriority: z.nativeEnum(Priority),
  taskDueDate: z.string().optional(),
  taskAssigneeIds: z.array(z.string()).optional(),
  taskAssignedById: z.string().optional(),
});

// Employee variant: taskAssignedById is mandatory when creating a task
const formSchemaEmployee = formSchemaBase.extend({
  taskAssignedById: z.string().min(1, "Assigned By is required"),
});

const formSchemaManager = formSchemaBase;

type FormValues = z.infer<typeof formSchemaBase>;

interface CreateProjectFormProps {
  clients: { id: string; companyName: string }[];
  managers: { id: string; name: string; email: string }[];
  teamMembers?: { id: string; name: string; department: string | null; role?: string }[];
  preselectedClientId?: string;
}

export function CreateProjectForm({ clients, managers, teamMembers = [], preselectedClientId }: CreateProjectFormProps) {
  const router = useRouter();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const { isEmployee, user: currentUser } = usePermissions();
  const currentUserId = currentUser?.id;

  const preselectedClient = preselectedClientId
    ? clients.find((c) => c.id === preselectedClientId)
    : null;

  const activeSchema = isEmployee ? formSchemaEmployee : formSchemaManager;

  // Manager options for "Assigned By" dropdown (employees only)
  const assignerOptions = useMemo(() => {
    const options = [{ value: currentUserId || "", label: "MYSELF (FOR MY OWN TASK)" }];
    const mgrs = teamMembers
      .filter((m) => m.id !== currentUserId && (m.role === "ADMIN" || m.role === "SUPER_ADMIN"))
      .map((m) => ({
        value: m.id,
        label: `${m.name}${m.department ? ` (${m.department})` : ""} - MANAGER`,
      }));
    return [...options, ...mgrs];
  }, [teamMembers, currentUserId]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(activeSchema),
    defaultValues: {
      clientId: preselectedClientId || "",
      taskPriority: Priority.MEDIUM,
      taskAssigneeIds: [],
      taskAssignedById: "",
    },
  });

  const selectedAssigneeIds = watch("taskAssigneeIds") || [];

  const filteredMembers = teamMembers.filter(
    (m) => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const toggleAssignee = (memberId: string) => {
    const current = selectedAssigneeIds;
    if (current.includes(memberId)) {
      setValue("taskAssigneeIds", current.filter((id) => id !== memberId));
    } else {
      setValue("taskAssigneeIds", [...current, memberId]);
    }
  };

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

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Create project
      const project = await createProjectRecord({
        title: data.title,
        clientId: data.clientId,
        priority: Priority.MEDIUM,
      });

      // 2. Upload project attachments if any
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

      // 3. Create the first task if title is provided
      if (data.taskTitle && data.taskTitle.trim().length >= 2) {
        await createTask({
          projectId: project.id,
          title: data.taskTitle,
          description: data.taskDescription,
          priority: data.taskPriority,
          assigneeIds: isEmployee && currentUserId ? [currentUserId] : (data.taskAssigneeIds?.length ? data.taskAssigneeIds : undefined),
          assignedById: isEmployee ? (data.taskAssignedById || currentUserId) : undefined,
          dueDate: data.taskDueDate ? new Date(data.taskDueDate) : undefined,
        });
      }

      // 4. Redirect to project page
      router.push(`/projects/${project.id}`);
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to create project.", { duration: 5000 });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: PROJECT DETAILS
          ═══════════════════════════════════════════════════════════════════════ */}
      
      {/* Project Title */}
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

      {/* Client Binding */}
      <div className="space-y-1.5">
        <label className="font-label text-[9px] uppercase text-primary tracking-widest">
          CLIENT_BINDING
        </label>
        {preselectedClient ? (
          <>
            <input type="hidden" {...register("clientId")} />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: FIRST TASK (included by default)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="brutalist-border p-4 space-y-3.5 bg-surface-container-lowest">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-base">add_task</span>
          <h3 className="font-headline text-xs uppercase tracking-widest text-on-surface/60">FIRST_TASK</h3>
          <span className="font-mono text-[8px] text-on-surface/30 uppercase ml-auto">OPTIONAL — LEAVE BLANK TO SKIP</span>
        </div>

        {/* Task Title */}
        <div className="space-y-1">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">TASK_TITLE</label>
          <input
            {...register("taskTitle")}
            className="w-full h-10 bg-transparent brutalist-border px-3 py-2 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors uppercase"
            placeholder="E.G. DESIGN SOCIAL MEDIA CAROUSEL"
          />
        </div>

        {/* Task Description */}
        <div className="space-y-1">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">DESCRIPTION</label>
          <textarea
            {...register("taskDescription")}
            rows={2}
            className="w-full bg-transparent brutalist-border px-3 py-2 font-body text-sm focus:border-primary-container focus:outline-none focus:bg-card/5 transition-colors resize-none"
            placeholder="Task details..."
          />
        </div>

        {/* Task Priority + Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">PRIORITY</label>
            <Controller
              name="taskPriority"
              control={control}
              render={({ field }) => (
                <AppSelect
                  options={Object.values(Priority).map(p => ({ value: p, label: p }))}
                  value={field.value}
                  onChange={(val) => field.onChange(val as Priority)}
                  placeholder=""
                  className="h-11"
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">DUE_DATE_TIME</label>
            <input
              type="datetime-local"
              {...register("taskDueDate")}
              className="w-full h-11 bg-[var(--clr-surface-low)] brutalist-border px-3 font-mono text-[10px] uppercase tracking-widest focus:border-primary-container focus:outline-none"
            />
          </div>
        </div>

        {/* Assigned By (mandatory for employees) OR Assignees (for managers) */}
        {isEmployee ? (
          <div className="space-y-1.5">
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">
              ASSIGNED_BY <span className="text-red-500">*</span>
            </label>
            <Controller
              name="taskAssignedById"
              control={control}
              render={({ field }) => (
                <AppSelect
                  options={assignerOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="— SELECT ASSIGNER —"
                  className={`h-11 ${errors.taskAssignedById ? "border-red-500" : ""}`}
                />
              )}
            />
            {errors.taskAssignedById && <p className="text-red-500 text-[9px] font-mono uppercase">{errors.taskAssignedById.message}</p>}
          </div>
        ) : (
          teamMembers.length > 0 && (
            <div className="space-y-1 relative">
              <label className="font-label text-[9px] uppercase text-primary tracking-widest">ASSIGNEES</label>
              <div
                className="min-h-[44px] w-full bg-transparent brutalist-border px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-pointer"
                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
              >
                {selectedAssigneeIds.length === 0 ? (
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface/30 px-1">— SELECT ASSIGNEES —</span>
                ) : (
                  selectedAssigneeIds.map((id) => {
                    const member = teamMembers.find((m) => m.id === id);
                    if (!member) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 text-[9px] font-headline uppercase tracking-wider border border-primary/20"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleAssignee(id); }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[10px]">close</span>
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
              {assigneeDropdownOpen && (
                <div className="brutalist-border bg-surface-container-lowest max-h-48 overflow-y-auto shadow-lg mt-1 z-20 relative">
                  <div className="p-1.5 border-b border-on-surface/10 sticky top-0 bg-surface-container-lowest z-10">
                    <input
                      type="text"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-transparent px-2 py-1 font-body text-xs focus:outline-none"
                      autoFocus
                    />
                  </div>
                  {filteredMembers.map((member) => {
                    const isSelected = selectedAssigneeIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-container-low transition-colors"
                        onClick={() => toggleAssignee(member.id)}
                      >
                        <div className={`w-4 h-4 flex-shrink-0 brutalist-border flex items-center justify-center ${isSelected ? "bg-primary text-white" : ""}`}>
                          {isSelected && <span className="material-symbols-outlined text-[10px]">check</span>}
                        </div>
                        <span className="font-label text-[10px] uppercase tracking-wide text-foreground truncate">{member.name}</span>
                        {member.department && (
                          <span className="font-mono text-[8px] text-on-surface/30 uppercase ml-auto flex-shrink-0">{member.department}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* Deliverables Attachment */}
        <div className="space-y-1">
          <label className="font-label text-[9px] uppercase text-primary tracking-widest">
            DELIVERABLES_ATTACHMENTS
          </label>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`brutalist-border border-dashed p-4 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
              ${isDragging ? "bg-primary/10 border-primary" : "bg-card-muted hover:bg-neutral-200"}
            `}
          >
            <input
              type="file"
              multiple
              onChange={onManualFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-xl mb-1 text-muted-foreground">
              attach_file
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-card-text">
              DROP FILES OR CLICK TO UPLOAD
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 brutalist-border bg-card text-xs font-mono uppercase">
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
