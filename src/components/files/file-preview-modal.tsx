"use client";

import { useState, useEffect } from "react";
import { getFileVersions } from "@/app/actions/files";
import { ImageAnnotator } from "@/components/annotations/image-annotator";

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  version: number;
  createdAt: Date;
  uploadedBy?: { name: string } | null;
  parentFileId?: string | null;
  client?: { companyName: string; brandColor: string } | null;
  project?: { title: string } | null;
  task?: { title: string } | null;
  taskId?: string | null;
  versions?: { id: string; version: number }[];
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData | null;
  taskId?: string;
}

export function FilePreviewModal({ isOpen, onClose, file, taskId }: FilePreviewModalProps) {
  const [versions, setVersions] = useState<FileData[]>([]);
  const [activeFile, setActiveFile] = useState<FileData | null>(file);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      setActiveFile(file);
      setLoadingVersions(true);
      getFileVersions(file.id)
        .then((v) => {
          setVersions(v as FileData[]);
          setLoadingVersions(false);
        })
        .catch(() => setLoadingVersions(false));
    }
  }, [file, isOpen]);

  if (!isOpen || !activeFile) return null;

  const isImage = activeFile.mimeType.startsWith("image/");
  const isVideo = activeFile.mimeType.startsWith("video/");
  const isPdf = activeFile.mimeType.includes("pdf");
  const resolvedTaskId = taskId || (activeFile as FileData & { taskId?: string }).taskId || undefined;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card brutalist-border w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-sm text-card-text">preview</span>
            <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text truncate">
              {activeFile.originalName}
            </h3>
            <span className="font-mono text-[11px] bg-primary text-on-primary px-2 py-0.5 flex-shrink-0">
              v{activeFile.version}
            </span>
          </div>
          <button onClick={onClose} className="text-on-surface/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 bg-surface-container-lowest overflow-auto">
            {isImage ? (
              <ImageAnnotator
                src={activeFile.fileUrl}
                fileId={activeFile.id}
                taskId={resolvedTaskId}
              />
            ) : isVideo ? (
              <video
                src={activeFile.fileUrl}
                controls
                className="max-w-full max-h-[60vh]"
              />
            ) : isPdf ? (
              <iframe
                src={activeFile.fileUrl}
                className="w-full h-[60vh] border-0"
                title={activeFile.originalName}
              />
            ) : (
              <div className="text-center p-8">
                <span className="material-symbols-outlined text-5xl text-on-surface/30 mb-4 block">
                  description
                </span>
                <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50 mb-4">
                  PREVIEW_NOT_AVAILABLE
                </p>
                <a
                  href={activeFile.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mono-clip bg-primary text-on-primary px-6 py-2 font-headline text-[10px] uppercase hover:bg-primary/80 transition-colors"
                >
                  DOWNLOAD FILE
                </a>
              </div>
            )}
          </div>

          {/* Version History Sidebar */}
          <div className="w-64 brutalist-border border-t-0 border-b-0 border-r-0 flex flex-col flex-shrink-0 bg-card">
            <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted">
              <h4 className="font-headline text-[10px] uppercase tracking-widest text-card-text">
                VERSION_HISTORY
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
              {loadingVersions ? (
                <div className="p-4 text-center">
                  <p className="font-mono text-[11px] text-on-surface/50 uppercase">LOADING...</p>
                </div>
              ) : versions.length <= 1 ? (
                <div className="p-4 text-center">
                  <p className="font-mono text-[11px] text-on-surface/50 uppercase">SINGLE_VERSION</p>
                </div>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveFile(v)}
                    className={`w-full px-4 py-3 text-left hover:bg-surface-container-high transition-colors ${
                      activeFile.id === v.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline text-[10px] uppercase text-card-text">
                        v{v.version}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface/50">
                        {formatBytes(v.fileSize)}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-on-surface/40">
                      {v.uploadedBy?.name || "SYSTEM"} • {new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* File Meta */}
            <div className="p-4 brutalist-border border-b-0 border-x-0 bg-card-muted space-y-2">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase text-on-surface/50">TYPE</span>
                <span className="font-mono text-[10px] uppercase text-on-surface">{activeFile.mimeType.split("/")[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase text-on-surface/50">SIZE</span>
                <span className="font-mono text-[10px] uppercase text-on-surface">{formatBytes(activeFile.fileSize)}</span>
              </div>
              <a
                href={activeFile.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center mono-clip bg-primary text-on-primary py-2 font-headline text-[11px] uppercase hover:bg-primary/80 transition-colors mt-3"
              >
                DOWNLOAD
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
