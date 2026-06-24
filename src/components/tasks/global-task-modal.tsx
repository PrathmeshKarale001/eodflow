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
    // Fetch data on first open or when data is stale
    if (!data && !loading) {
      setLoading(true);
      try {
        const result = await getCreateTaskData();
        setData(result as ModalData);
      } catch (err) {
        console.error("Failed to load task modal data:", err);
      } finally {
        setLoading(false);
      }
    }
  }, [data, loading]);

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
      {isOpen && (
        <CreateTaskModal
          isOpen={isOpen}
          onClose={handleClose}
          onSuccess={handleSuccess}
          teamMembers={data?.teamMembers ?? []}
          projects={data?.projects ?? []}
          brands={data?.brands ?? []}
        />
      )}
    </GlobalTaskModalContext.Provider>
  );
}
