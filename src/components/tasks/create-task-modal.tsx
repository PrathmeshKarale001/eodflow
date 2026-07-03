"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createTask } from "@/app/actions/tasks";
import { createProjectRecord } from "@/app/actions/create-project";
import { Priority, Role } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";
import { usePermissions } from "@/hooks/use-permissions";

const taskSchemaBase = z.object({
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  assignedById: z.string().optional(),
});

// Employee variant: assignedById is mandatory
const taskSchemaEmployee = taskSchemaBase.extend({
  assignedById: z.string().min(1, "Assigned By is required"),
});

// Manager/Admin variant: assignedById stays optional
const taskSchemaManager = taskSchemaBase;

type TaskFormValues = z.infer<typeof taskSchemaBase>;

interface CreateTaskModalProps {
  projectId?: string;
  projects?: Array<{ id: string; title: string; clientId?: string | null }>;
  brands?: Array<{ id: string; companyName: string }>;
  teamMembers?: Array<{ id: string; name: string; department: string | null; role?: string }>;
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

  // Quick Create Project state
  const [showQuickProject, setShowQuickProject] = useState(false);
  const [quickProjectTitle, setQuickProjectTitle] = useState("");
  const [quickProjectPriority, setQuickProjectPriority] = useState<Priority>(Priority.MEDIUM);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [quickProjectError, setQuickProjectError] = useState("");
  // Local copy of projects so we can append newly created ones without a full refetch
  const [localProjects, setLocalProjects] = useState(projects);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const { role, user, isEmployee } = usePermissions();
  const currentUserId = user?.id;

  const activeSchema = isEmployee ? taskSchemaEmployee : taskSchemaManager;
  type ActiveFormValues = z.infer<typeof activeSchema> & { selectedProjectId: string };

  const { register, handleSubmit, control, formState: { errors }, reset, setValue, watch } = useForm<TaskFormValues & { selectedProjectId: string }>({
    resolver: zodResolver(activeSchema.extend({
      selectedProjectId: z.string().min(1, "Project is required"),
    })),
    defaultValues: {
      priority: Priority.MEDIUM,
      selectedProjectId: projectId || "",
      assigneeIds: [],
      assignedById: "",
    },
  });

  // Manual brand validation (not in form schema since it's UI-only filter state)
  const [brandError, setBrandError] = useState("");

  // Default: set current user as assigner for all roles
  useEffect(() => {
    if (currentUserId) {
      setValue("assignedById", currentUserId);
      // Employees can only assign to themselves
      if (isEmployee) {
        setValue("assigneeIds", [currentUserId]);
      }
    }
  }, [isEmployee, currentUserId, setValue]);

  const selectedAssigneeIds = watch("assigneeIds") || [];

  // Keep localProjects in sync when parent prop changes (e.g. global modal re-fetch)
  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  // Filter projects by selected brand
  const filteredProjects = useMemo(() => {
    if (!selectedBrandId) return localProjects;
    return localProjects.filter((p) => p.clientId === selectedBrandId);
  }, [localProjects, selectedBrandId]);

  const projectOptions = filteredProjects.map((p) => ({ value: p.id, label: p.title }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.companyName }));

  const isManager = role === "ADMIN";
  const isDirector = role === "SUPER_ADMIN";

  // Generate "Assigned By" options based on role:
  // Employees → see managers/directors above them
  // Managers → see directors above them
  // Directors → only self (they are the top)
  const assignerOptions = useMemo(() => {
    const options = [{ value: currentUserId || "", label: "Myself (My Own Task)" }];
    if (isEmployee) {
      // Employees can claim a manager or director assigned them
      const superiors = teamMembers
        .filter((m) => m.id !== currentUserId && (m.role === "ADMIN" || m.role === "SUPER_ADMIN"))
        .map((m) => ({
          value: m.id,
          label: `${m.name}${m.department ? ` (${m.department})` : ""} — ${m.role === "SUPER_ADMIN" ? "DIRECTOR" : "MANAGER"}`,
        }));
      return [...options, ...superiors];
    }
    if (isManager) {
      // Managers can claim a director assigned them
      const directors = teamMembers
        .filter((m) => m.id !== currentUserId && m.role === "SUPER_ADMIN")
        .map((m) => ({
          value: m.id,
          label: `${m.name}${m.department ? ` (${m.department})` : ""} — DIRECTOR`,
        }));
      return [...options, ...directors];
    }
    // Directors: only self
    return options;
  }, [teamMembers, currentUserId, isEmployee, isManager]);

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

  const onSubmit = async (data: TaskFormValues & { selectedProjectId: string }) => {
    // Validate brand is selected (not in zod since it's UI-only state)
    if (!projectId && brands.length > 0 && !selectedBrandId) {
      setBrandError("Brand is required");
      return;
    }
    setBrandError("");

    const targetProjectId = projectId || data.selectedProjectId || undefined;

    setIsSubmitting(true);
    try {
      const task = await createTask({
        ...(targetProjectId ? { projectId: targetProjectId } : {}),
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeIds: isEmployee && currentUserId ? [currentUserId] : (data.assigneeIds?.length ? data.assigneeIds : undefined),
        assignedById: data.assignedById || currentUserId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
      reset();
      setSelectedBrandId("");
      setBrandError("");
      onClose();
      onSuccess?.(task.id);
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to create task.", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="brutalist-border bg-card w-full sm:max-w-lg sm:mx-4 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 sm:rounded-lg flex flex-col max-h-full sm:max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-[#180065] text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          <h2 className="font-headline text-base uppercase tracking-widest relative z-10">Create Task</h2>
          <button onClick={onClose} className="relative z-10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-sm">Close</span>
          </button>
        </div>

        {/* Modal Body — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3.5 overflow-y-auto flex-1 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">

          {/* Brand + Project Selectors (only when no pre-set projectId) */}
          {!projectId && (
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
                {errors.selectedProjectId && <p className="text-red-500 text-[11px] font-mono uppercase">{(errors.selectedProjectId as any).message}</p>}
                {/* + New Project button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBrandId && brands.length > 0) {
                      setBrandError("Select a brand first");
                      return;
                    }
                    setShowQuickProject(true);
                    setQuickProjectTitle("");
                    setQuickProjectPriority(Priority.MEDIUM);
                    setQuickProjectError("");
                  }}
                  className="mt-1 flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span className="font-label text-[10px] uppercase tracking-widest">New Project</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Create Project Panel */}
          {showQuickProject && (
            <div className="brutalist-border border-primary/30 bg-primary/5 p-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[11px] uppercase tracking-widest text-primary">Quick Create Project</span>
                <button
                  type="button"
                  onClick={() => setShowQuickProject(false)}
                  className="text-outline hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-label text-[10px] uppercase text-on-surface/60 tracking-widest">Project Title <span className="text-red-500">*</span></label>
                  <input
                    value={quickProjectTitle}
                    onChange={(e) => { setQuickProjectTitle(e.target.value); setQuickProjectError(""); }}
                    className="w-full h-9 bg-transparent brutalist-border px-3 py-1.5 font-body text-sm focus:border-primary-container focus:outline-none transition-colors"
                    placeholder="e.g. Instagram Campaign Q3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase text-on-surface/60 tracking-widest">Brand</label>
                  <div className="h-9 brutalist-border px-3 flex items-center font-body text-sm text-on-surface/60 bg-card/5">
                    {brands.find(b => b.id === selectedBrandId)?.companyName || "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase text-on-surface/60 tracking-widest">Priority</label>
                  <AppSelect
                    options={PRIORITY_OPTIONS}
                    value={quickProjectPriority}
                    onChange={(val) => setQuickProjectPriority(val as Priority)}
                    placeholder=""
                    className="h-9"
                  />
                </div>
              </div>
              {quickProjectError && <p className="text-red-500 text-[10px] font-mono uppercase">{quickProjectError}</p>}
              <button
                type="button"
                disabled={isCreatingProject}
                onClick={async () => {
                  if (!quickProjectTitle.trim()) {
                    setQuickProjectError("Project title is required");
                    return;
                  }
                  if (!selectedBrandId) {
                    setQuickProjectError("Select a brand first");
                    return;
                  }
                  setIsCreatingProject(true);
                  try {
                    const newProject = await createProjectRecord({
                      title: quickProjectTitle.trim(),
                      clientId: selectedBrandId,
                      priority: quickProjectPriority,
                    });
                    // Add to local projects list and auto-select
                    setLocalProjects((prev) => [...prev, { id: newProject.id, title: newProject.title, clientId: newProject.clientId }]);
                    setValue("selectedProjectId", newProject.id);
                    setShowQuickProject(false);
                    setQuickProjectTitle("");
                    const { toast } = await import("react-hot-toast");
                    toast.success(`Project "${newProject.title}" created!`, { duration: 3000 });
                  } catch (err: any) {
                    setQuickProjectError(err?.message || "Failed to create project");
                  } finally {
                    setIsCreatingProject(false);
                  }
                }}
                className="w-full rounded-lg bg-primary-container text-white py-2 font-headline text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">{isCreatingProject ? "progress_activity" : "add_circle"}</span>
                {isCreatingProject ? "Creating..." : "Create Project"}
              </button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="font-label text-[11px] uppercase text-primary tracking-widest">Task Title</label>
            <input
              {...register("title")}
              autoFocus
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

          {/* Priority + Due Date/Time */}
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

          {/* Assigned By — shown for ALL roles (everyone can say who gave them the task) */}
          <div className="space-y-1.5">
            <label className="font-label text-[11px] uppercase text-primary tracking-widest">
              Assigned By {isEmployee && <span className="text-red-500">*</span>}
            </label>
            <Controller
              name="assignedById"
              control={control}
              render={({ field }) => (
                <AppSelect
                  options={assignerOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="— Who assigned this? —"
                  className={`h-11 ${errors.assignedById ? "border-red-500" : ""}`}
                />
              )}
            />
            {errors.assignedById && <p className="text-red-500 text-[11px] font-mono uppercase">{errors.assignedById.message}</p>}
          </div>

          {/* Assignees — only for managers/directors who can assign to others */}
          {!isEmployee && (
            <div className="space-y-1 relative" ref={assigneeRef}>
              <label className="font-label text-[11px] uppercase text-primary tracking-widest">Assign To</label>
              {/* Selected Assignees Chips */}
              <div
                className="min-h-[44px] w-full bg-transparent brutalist-border px-2 py-1.5 flex flex-wrap gap-1.5 items-center cursor-pointer"
                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
              >
                {selectedAssigneeIds.length === 0 ? (
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface/30 px-1">— Select Assignees —</span>
                ) : (
                  selectedAssigneeIds.map((id) => {
                    const member = teamMembers.find((m) => m.id === id);
                    if (!member) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-headline uppercase tracking-wider border border-primary/20"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleAssignee(id); }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[10px]">Close</span>
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
              {/* Dropdown */}
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
                          <span className="font-mono text-[10px] text-on-surface/30 uppercase ml-auto flex-shrink-0">{member.department}</span>
                        )}
                      </button>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <div className="p-3 text-center">
                      <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/30">No members found</p>
                    </div>
                  )}
                </div>
              )}
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
              <span className="material-symbols-outlined text-sm">Add Task</span>
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
