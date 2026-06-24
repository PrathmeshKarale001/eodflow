"use client";

import { useState, useCallback } from "react";
import { uploadFileRecord } from "@/app/actions/files";
import { uploadFile } from "@/lib/storage-client";
import { AppSelect } from "@/components/ui/app-select";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{ id: string; companyName: string }>;
  projects: Array<{ id: string; title: string; clientId: string }>;
  uploaderName?: string;
  userId: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function FileUploadModal({ isOpen, onClose, clients, projects, uploaderName, userId }: FileUploadModalProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.clientId === selectedClientId)
    : projects;

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const newFiles = Array.from(fileList).map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < newFiles.length; i++) {
        const { file } = newFiles[i];
        const idx = uploadingFiles.length + i;

        setUploadingFiles((prev) =>
          prev.map((f, j) =>
            j === idx ? { ...f, status: "uploading", progress: 0 } : f
          )
        );

        try {
          // Build organized storage path:
          //   clients/{ClientName}/{ProjectTitle}  — if client selected
          //   projects/{ProjectTitle}              — if only project selected  
          //   general/{UploaderName}               — if nothing selected
          const clientName = selectedClientId
            ? clients.find((c) => c.id === selectedClientId)?.companyName || selectedClientId
            : "";
          const projectTitle = selectedProjectId
            ? (filteredProjects.find((p) => p.id === selectedProjectId)?.title || selectedProjectId)
            : "";

          let pathPrefix: string;
          if (clientName && projectTitle) {
            pathPrefix = `clients/${clientName}/${projectTitle}/${userId}`;
          } else if (clientName) {
            pathPrefix = `clients/${clientName}/${userId}`;
          } else if (projectTitle) {
            pathPrefix = `projects/${projectTitle}/${userId}`;
          } else {
            pathPrefix = `general/${userId}`;  
          }

          // Upload via presigned URL (direct to R2, bypasses Vercel 4.5MB limit)
          const { url } = await uploadFile(file, pathPrefix, (percent) => {
            setUploadingFiles((prev) =>
              prev.map((f, j) => (j === idx ? { ...f, progress: percent } : f))
            );
          });

          // Save record to DB via server action
          await uploadFileRecord({
            filename: file.name,
            originalName: file.name,
            fileUrl: url,
            mimeType: file.type,
            fileSize: file.size,
            clientId: selectedClientId || undefined,
            projectId: selectedProjectId || undefined,
          });

          setUploadingFiles((prev) =>
            prev.map((f, j) =>
              j === idx ? { ...f, status: "done", progress: 100 } : f
            )
          );
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f, j) =>
              j === idx
                ? { ...f, status: "error", error: (error as Error).message }
                : f
            )
          );
        }
      }
    },
    [selectedClientId, selectedProjectId, uploadingFiles.length]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) handleFiles(files);
    },
    [handleFiles]
  );

  const allDone =
    uploadingFiles.length > 0 &&
    uploadingFiles.every((f) => f.status === "done" || f.status === "error");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card brutalist-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-card-text">Upload File</span>
            <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">Upload Files</h3>
          </div>
          <button onClick={onClose} className="text-on-surface/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-lg">Close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Association Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-[11px] uppercase tracking-widest text-on-surface/50 block mb-1">
                Client (Optional)
              </label>
              <AppSelect
                options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
                value={selectedClientId}
                onChange={(val) => {
                  setSelectedClientId(val);
                  setSelectedProjectId("");
                }}
                placeholder="— None —"
                className="h-9"
              />
            </div>
            <div>
              <label className="font-label text-[11px] uppercase tracking-widest text-on-surface/50 block mb-1">
                Project (Optional)
              </label>
              <AppSelect
                options={filteredProjects.map((p) => ({ value: p.id, label: p.title }))}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                placeholder="— None —"
                className="h-9"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`brutalist-border p-10 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
              ${isDragging ? "bg-primary/10 border-primary" : "bg-card-muted"}
            `}
          >
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="material-symbols-outlined text-3xl mb-3 text-card-text">cloud_upload</span>
            <p className="font-headline text-sm uppercase tracking-widest text-card-text">
              Drop files here
            </p>
            <p className="font-mono text-[10px] uppercase text-on-surface/50 mt-1">
              or click to browse // JPG, PNG, PDF, MP4, etc.
            </p>
          </div>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              {uploadingFiles.map((uf, idx) => (
                <div key={idx} className="brutalist-border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-sm text-primary">
                      {uf.status === "done" ? "check_circle" : uf.status === "error" ? "error" : "cloud_upload"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase truncate text-on-surface">{uf.file.name}</p>
                      <div className="h-1 bg-card-muted mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            uf.status === "error" ? "bg-red-500" : uf.status === "done" ? "bg-green-500" : "bg-primary"
                          }`}
                          style={{ width: `${uf.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase text-on-surface/50">
                      {uf.status === "done" ? "Done" : uf.status === "error" ? "Failed" : `${uf.progress}%`}
                    </span>
                  </div>
                  {/* Show exact Supabase error for debugging */}
                  {uf.status === "error" && uf.error && (
                    <p className="font-mono text-[11px] text-red-400 pl-7 break-all">{uf.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Close button after all done */}
          {allDone && (
            <button
              onClick={() => { setUploadingFiles([]); onClose(); }}
              className="w-full rounded-lg bg-primary text-on-primary py-3 font-headline text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
