"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface CreateTaskModalProps {
  projectId?: string;
  projects?: Array<{ id: string; title: string; clientId?: string | null }>;
  brands?: Array<{ id: string; companyName: string }>;
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (taskId: string) => void;
}

const PRIORITY_OPTIONS = Object.values(Priority).map((p) => ({ value: p, label: p }));

export function CreateTaskModal({ projectId, projects = [], brands = [], teamMembers = [], isOpen, onClose, onSuccess }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const assigneeRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control, formState: { errors }, reset, setValue, watch } = useForm<TaskFormValues & { selectedProjectId?: string }>({
    resolver: zodResolver(taskSchema.extend({
      selectedProjectId: z.string().optional(),
    })),
    defaultValues: {
      priority: Priority.MEDIUM,
      selectedProjectId: projectId || "",
      assigneeIds: [],
    },
  });

  const selectedAssigneeIds = watch("assigneeIds") || [];

  // Filter projects by selected brand
  const filteredProjects = useMemo(() => {
    if (!selectedBrandId) return projects;
    return projects.filter((p) => p.clientId === selectedBrandId);
  }, [projects, selectedBrandId]);

  const projectOptions = filteredProjects.map((p) => ({ value: p.id, label: p.title }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.companyName }));

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isOpen) return null;

  const filteredMembers = teamMembers.filter(
    (m) => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const toggleAssignee = (memberId: string) => {
    const current = selectedAssigneeIds;
    if (current.includes(memberId)) {
      setValue("assigneeIds", current.filter((id) => id !== memberId));
    } else {
      setValue("assigneeIds", [...current, memberId]);
    }
  };

  const onSubmit = async (data: TaskFormValues & { selectedProjectId?: string }) => {
    const targetProjectId = projectId || data.selectedProjectId || undefined;

    setIsSubmitting(true);
    try {
      const task = await createTask({
        ...(targetProjectId ? { projectId: targetProjectId } : {}),
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      reset();
      setSelectedBrandId("");
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto py-8">
      <div className="brutalist-border bg-card w-full max-w-lg mx-4 shadow-[4px_4px_0px_#180065] animate-in zoom-in-95 duration-300 my-auto">
        {/* Modal Header */}
        <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-[#180065] text-white relative overflow-hidden">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          <h2 className="font-headline text-base uppercase tracking-widest relative z-10">CREATE_TASK</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Body — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">

          {/* Brand + Project Selectors (only when no pre-set projectId) */}
          {!projectId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Brand Selector */}
              {brands.length > 0 && (
                <div className="space-y-1">
                  <label className="font-label text-[9px] uppercase text-primary tracking-widest">BRAND <span className="text-on-surface/30">(OPTIONAL)</span></label>
                  <AppSelect
                    options={brandOptions}
                    value={selectedBrandId}
                    onChange={(val) => {
                      setSelectedBrandId(val);
                      // Reset project when brand changes
                      setValue("selectedProjectId", "");
                    }}
                    placeholder="— SELECT BRAND —"
                  />
                </div>
              )}

              {/* Project Selector */}
              <div className="space-y-1">
                <label className="font-label text-[9px] uppercase text-primary tracking-widest">PROJECT <span className="text-on-surface/30">(OPTIONAL)</span></label>
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
              </div>
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

          {/* Priority + Due Date/Time */}
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

          {/* Multi-Assign To */}
          <div className="space-y-1 relative" ref={assigneeRef}>
            <label className="font-label text-[9px] uppercase text-primary tracking-widest">ASSIGNEES</label>
            {/* Selected Assignees Chips */}
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
            {/* Dropdown — constrained height, scrollable, sticky search */}
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
                {filteredMembers.length === 0 && (
                  <div className="p-3 text-center">
                    <p className="font-label text-[9px] uppercase tracking-widest text-on-surface/30">NO_MEMBERS_FOUND</p>
                  </div>
                )}
              </div>
            )}
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
