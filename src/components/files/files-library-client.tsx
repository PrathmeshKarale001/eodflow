"use client";

import { useState, useCallback, startTransition } from "react";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { deleteFile, uploadNewVersion } from "@/app/actions/files";
import { uploadFile } from "@/lib/storage-client";

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  version: number;
  parentFileId: string | null;
  createdAt: Date;
  uploadedBy: { name: string } | null;
  client: { companyName: string; brandColor: string } | null;
  project: { title: string } | null;
  task: { title: string } | null;
  versions?: { id: string; version: number }[];
}

interface FilesLibraryClientProps {
  initialFiles: FileRecord[];
  clients: Array<{ id: string; companyName: string }>;
  projects: Array<{ id: string; title: string; clientId: string }>;
  totalSize: number;
  uploaderName?: string;
  userId: string;
}

export function FilesLibraryClient({ initialFiles, clients, projects, totalSize, uploaderName, userId }: FilesLibraryClientProps) {
  const [files, setFiles] = useState<FileRecord[]>(initialFiles);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "document">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(initialFiles.length >= 50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const { fetchFilesAction } = await import("@/app/actions/files");
      const nextBatch = await fetchFilesAction(files.length);
      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        setFiles((prev) => [...prev, ...nextBatch]);
        if (nextBatch.length < 50) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to load more files", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Filter files client-side
  const filtered = files.filter((f) => {
    if (search) {
      const q = search.toLowerCase();
      if (!f.originalName.toLowerCase().includes(q) && !f.filename.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (typeFilter === "image" && !f.mimeType.includes("image")) return false;
    if (typeFilter === "video" && !f.mimeType.includes("video")) return false;
    if (typeFilter === "document" && !f.mimeType.includes("pdf") && !f.mimeType.includes("document") && !f.mimeType.includes("word") && !f.mimeType.includes("spreadsheet")) return false;
    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes("image")) return "image";
    if (mime.includes("video")) return "movie";
    if (mime.includes("pdf")) return "picture_as_pdf";
    if (mime.includes("document") || mime.includes("word")) return "description";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "table_chart";
    return "attach_file";
  };

  const handleDelete = useCallback((fileId: string) => {
    if (!confirm("Delete this file permanently?")) return;
    setDeletingId(fileId);
    startTransition(async () => {
      try {
        await deleteFile(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to delete file.", { duration: 5000 });
      } finally {
        setDeletingId(null);
      }
    });
  }, []);

  const handleNewVersion = useCallback(async (parentFile: FileRecord, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target.files?.[0];
    if (!fileInput) return;

    try {
      const pathPrefix = parentFile.client
        ? `clients/${parentFile.client.companyName}/${userId}`
        : parentFile.project
          ? `projects/${parentFile.project.title}/${userId}`
          : `general/${userId}`;

      const { url } = await uploadFile(fileInput, pathPrefix);

      const newVersion = await uploadNewVersion({
        parentFileId: parentFile.id,
        filename: fileInput.name,
        originalName: fileInput.name,
        fileUrl: url,
        mimeType: fileInput.type,
        fileSize: fileInput.size,
      });

      // Update the version display
      setFiles((prev) =>
        prev.map((f) =>
          f.id === parentFile.id
            ? { ...f, version: (newVersion as unknown as FileRecord).version }
            : f
        )
      );
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to upload new version.", { duration: 5000 });
    }
  }, []);

  const stats = {
    total: files.length,
    images: files.filter((f) => f.mimeType.includes("image")).length,
    docs: files.filter((f) => f.mimeType.includes("pdf") || f.mimeType.includes("document")).length,
    videos: files.filter((f) => f.mimeType.includes("video")).length,
  };

  const typeFilters: Array<{ key: typeof typeFilter; label: string; count: number; icon: string }> = [
    { key: "all", label: "ALL", count: stats.total, icon: "folder_open" },
    { key: "image", label: "IMAGES", count: stats.images, icon: "image" },
    { key: "document", label: "DOCS", count: stats.docs, icon: "description" },
    { key: "video", label: "VIDEO", count: stats.videos, icon: "movie" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              MEDIA_LIBRARY
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50">
              {files.length} FILES — {formatBytes(totalSize)} TOTAL
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="mono-clip bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              UPLOAD
            </button>
            <span className="material-symbols-outlined text-[36px] text-primary">folder_open</span>
          </div>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="grid grid-cols-4 gap-3">
        {typeFilters.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTypeFilter(tf.key)}
            className={`brutalist-border p-4 text-left transition-all ${
              typeFilter === tf.key
                ? "bg-primary/10 border-primary shadow-[2px_2px_0px_var(--clr-primary)]"
                : "bg-card hover:bg-card-muted"
            }`}
          >
            <span className="material-symbols-outlined text-sm text-primary mb-2 block">{tf.icon}</span>
            <span className="font-headline text-2xl font-bold text-on-surface block">{tf.count}</span>
            <span className="font-label text-[10px] text-on-surface/50 uppercase tracking-widest">{tf.label}</span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="brutalist-border bg-card flex items-center gap-2 px-4">
        <span className="material-symbols-outlined text-sm text-on-surface/40">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH FILES BY NAME..."
          className="flex-1 h-10 bg-transparent font-mono text-xs uppercase tracking-wide text-on-surface placeholder:text-on-surface/30 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-on-surface/40 hover:text-on-surface">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* File Grid / Table */}
      {filtered.length > 0 ? (
        <div className="brutalist-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-card-muted border-b-2 border-on-surface/10">
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-on-surface/50">FILE</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-on-surface/50">CLIENT</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-on-surface/50">PROJECT</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-on-surface/50">UPLOADER</th>
                <th className="px-4 py-3 text-right font-label text-[11px] uppercase tracking-widest text-on-surface/50">SIZE</th>
                <th className="px-4 py-3 text-right font-label text-[11px] uppercase tracking-widest text-on-surface/50">DATE</th>
                <th className="px-4 py-3 text-center font-label text-[11px] uppercase tracking-widest text-on-surface/50">VER</th>
                <th className="px-4 py-3 text-center font-label text-[11px] uppercase tracking-widest text-on-surface/50">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-on-surface/5">
              {filtered.map((file) => (
                <tr key={file.id} className="hover:bg-card-muted/50 transition-colors group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">{getFileIcon(file.mimeType)}</span>
                      <div className="min-w-0">
                        <span className="font-label text-[11px] uppercase tracking-wide text-on-surface block truncate max-w-[200px] group-hover:text-primary transition-colors">
                          {file.originalName}
                        </span>
                        <span className="font-label text-[10px] text-on-surface/40 uppercase">{file.mimeType.split("/")[1]}</span>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {file.client ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: file.client.brandColor || "#6c5ce7" }} />
                        <span className="font-label text-[10px] text-on-surface uppercase truncate max-w-[100px]">
                          {file.client.companyName}
                        </span>
                      </div>
                    ) : (
                      <span className="font-label text-[10px] text-on-surface/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-label text-[10px] text-on-surface/60 uppercase truncate max-w-[120px] block">
                      {file.project?.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-label text-[10px] text-on-surface uppercase">
                      {file.uploadedBy?.name ?? "SYSTEM"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-headline text-[10px] text-on-surface">{formatBytes(file.fileSize)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-label text-[10px] text-on-surface/60">
                      {new Date(file.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-headline text-[10px] text-on-surface/60">v{file.version}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Preview */}
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-1 hover:bg-primary/10 transition-colors text-on-surface/50 hover:text-primary"
                        title="Preview"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      {/* New Version */}
                      <label className="p-1 hover:bg-primary/10 transition-colors text-on-surface/50 hover:text-primary cursor-pointer" title="Upload new version">
                        <span className="material-symbols-outlined text-sm">upgrade</span>
                        <input type="file" className="hidden" onChange={(e) => handleNewVersion(file, e)} />
                      </label>
                      {/* Download */}
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-primary/10 transition-colors text-on-surface/50 hover:text-primary"
                        title="Download"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                      </a>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="p-1 hover:bg-red-500/10 transition-colors text-on-surface/50 hover:text-red-500 disabled:opacity-30"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="brutalist-border bg-surface hover:bg-surface-container-high px-6 py-2.5 font-headline text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "LOADING..." : "LOAD MORE FILES"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="brutalist-border p-12 text-center bg-card">
          <span className="material-symbols-outlined text-3xl text-on-surface/20 mb-3 block">folder_off</span>
          <p className="font-label text-[10px] text-on-surface/40 uppercase tracking-widest">
            {search ? "NO_MATCHING_FILES" : "NO_FILES_FOUND"}
          </p>
          {!search && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 mono-clip bg-primary text-on-primary px-5 py-2 font-headline text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-colors"
            >
              UPLOAD YOUR FIRST FILE
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false);
          // Refresh the page to get updated file list
          window.location.reload();
        }}
        clients={clients}
        projects={projects}
        uploaderName={uploaderName}
        userId={userId}
      />

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
