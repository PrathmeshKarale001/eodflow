"use client";

import { useState, useCallback } from "react";
import { uploadFile } from "@/lib/storage";
import { uploadFileRecord } from "@/app/actions/files";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{ id: string; companyName: string }>;
  projects: Array<{ id: string; title: string; clientId: string }>;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function FileUploadModal({ isOpen, onClose, clients, projects }: FileUploadModalProps) {
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
            j === idx ? { ...f, status: "uploading", progress: 30 } : f
          )
        );

        try {
          // 1. Upload to Supabase Storage
          const pathPrefix = selectedClientId
            ? `clients/${selectedClientId}`
            : selectedProjectId
              ? `projects/${selectedProjectId}`
              : "general";

          const { url } = await uploadFile(file, pathPrefix);

          setUploadingFiles((prev) =>
            prev.map((f, j) =>
              j === idx ? { ...f, progress: 70 } : f
            )
          );

          // 2. Create DB record via server action
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

  const allDone = uploadingFiles.length > 0 && uploadingFiles.every((f) => f.status === "done" || f.status === "error");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card brutalist-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-card-text">upload_file</span>
            <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">UPLOAD_FILES</h3>
          </div>
          <button onClick={onClose} className="text-on-surface/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Association Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-[9px] uppercase tracking-widest text-on-surface/50 block mb-1">
                CLIENT (OPTIONAL)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedProjectId("");
                }}
                className="w-full h-9 brutalist-border px-2 font-mono text-xs bg-card text-on-surface"
              >
                <option value="">— NONE —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label text-[9px] uppercase tracking-widest text-on-surface/50 block mb-1">
                PROJECT (OPTIONAL)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-9 brutalist-border px-2 font-mono text-xs bg-card text-on-surface"
              >
                <option value="">— NONE —</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
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
              DROP FILES HERE
            </p>
            <p className="font-mono text-[10px] uppercase text-on-surface/50 mt-1">
              or click to browse // JPG, PNG, PDF, MP4, etc.
            </p>
          </div>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              {uploadingFiles.map((uf, idx) => (
                <div key={idx} className="brutalist-border p-3 bg-card flex items-center gap-3">
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
                  <span className="font-mono text-[8px] uppercase text-on-surface/50">
                    {uf.status === "done" ? "DONE" : uf.status === "error" ? "FAIL" : `${uf.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {allDone && (
            <button
              onClick={() => { setUploadingFiles([]); onClose(); }}
              className="w-full mono-clip bg-primary text-on-primary py-3 font-headline text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
