"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "@/app/actions/clients";
import { EditClientModal } from "@/components/clients/edit-client-modal";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

interface ClientActionsProps {
  client: {
    id: string;
    companyName: string;
    industry: string | null;
    brandColor: string | null;
    website: string | null;
  };
  userRole: Role;
}

export function ClientActions({ client, userRole }: ClientActionsProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canEdit = hasPermission(userRole, "editClient");
  const canDelete = hasPermission(userRole, "deleteClient");

  if (!canEdit && !canDelete) return null;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDeleteTransition(async () => {
      await deleteClient(client.id);
      router.push("/clients");
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <button
            onClick={() => setShowEditModal(true)}
            className="brutalist-border px-4 py-2 font-headline text-xs uppercase text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            EDIT_CLIENT
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
                DELETING...
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
        <EditClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
