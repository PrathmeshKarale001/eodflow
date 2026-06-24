"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/actions/projects";
import { EditProjectModal } from "@/components/projects/edit-project-modal";
import { hasPermission } from "@/lib/permissions";
import type { Role, Priority, ProjectStatus } from "@prisma/client";

interface ProjectActionsProps {
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
  userRole: Role;
}

export function ProjectActions({ project, managers, userRole }: ProjectActionsProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canEdit = hasPermission(userRole, "editProject");
  const canDelete = hasPermission(userRole, "deleteProject");

  if (!canEdit && !canDelete) return null;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDeleteTransition(async () => {
      try {
        await deleteProject(project.id);
        router.push("/projects");
      } catch (err: any) {
        setConfirmDelete(false);
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to delete project.", { duration: 5000 });
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <button
            onClick={() => setShowEditModal(true)}
            className="brutalist-border px-4 py-2 font-headline text-xs uppercase text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit Project
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isPendingDelete}
            className={`brutalist-border px-4 py-2 font-headline text-xs uppercase transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
              confirmDelete
                ? "bg-error text-white border-error hover:brightness-110"
                : "text-error/70 hover:text-error hover:bg-error/10"
            }`}
          >
            {isPendingDelete ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Deleting...
              </>
            ) : confirmDelete ? (
              <>
                <span className="material-symbols-outlined text-sm">warning</span>
                CONFIRM_DELETE
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">delete</span>
                DELETE
              </>
            )}
          </button>
        )}
        {confirmDelete && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="brutalist-border px-3 py-2 font-headline text-xs uppercase text-on-surface/50 hover:text-on-surface transition-colors"
          >
            CANCEL
          </button>
        )}
      </div>

      {showEditModal && (
        <EditProjectModal
          project={project}
          managers={managers}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
