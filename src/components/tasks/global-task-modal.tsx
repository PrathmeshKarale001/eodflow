"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { getCreateTaskData } from "@/app/actions/tasks";

// Lazy-load the modal — only downloads JS when first opened
const CreateTaskModal = dynamic(
  () => import("./create-task-modal").then((m) => m.CreateTaskModal),
  { ssr: false }
);

// Prefetch the module immediately so it's warm when user clicks
if (typeof window !== "undefined") {
  import("./create-task-modal");
}

interface GlobalTaskModalContextValue {
  openCreateTask: () => void;
}

const GlobalTaskModalContext = createContext<GlobalTaskModalContextValue>({
  openCreateTask: () => {},
});

export function useGlobalTaskModal() {
  return useContext(GlobalTaskModalContext);
}

interface ModalData {
  teamMembers: Array<{ id: string; name: string; role: string; department: string | null; image: string | null }>;
  projects: Array<{ id: string; title: string; clientId: string | null }>;
  brands: Array<{ id: string; companyName: string }>;
}

export function GlobalTaskModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ModalData | null>(null);
  const [loading, setLoading] = useState(false);

  const openCreateTask = useCallback(async () => {
    setIsOpen(true);
    // Always fetch fresh data when modal opens
    setLoading(true);
    try {
      const result = await getCreateTaskData();
      setData(result as ModalData);
    } catch (err) {
      console.error("Failed to load task modal data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    // Invalidate cached data so next open gets fresh data
    setData(null);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  return (
    <GlobalTaskModalContext.Provider value={{ openCreateTask }}>
      {children}
      {isOpen && !loading && data && (
        <CreateTaskModal
          isOpen={isOpen}
          onClose={handleClose}
          onSuccess={handleSuccess}
          teamMembers={data.teamMembers}
          projects={data.projects}
          brands={data.brands}
        />
      )}
      {isOpen && loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="brutalist-border bg-card p-8 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-primary animate-spin">progress_activity</span>
            <span className="font-headline text-xs uppercase tracking-widest text-on-surface/60">Loading task data...</span>
          </div>
        </div>
      )}
    </GlobalTaskModalContext.Provider>
  );
}

