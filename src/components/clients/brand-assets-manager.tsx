"use client";

import { useState, useCallback } from "react";
import { uploadFile } from "@/lib/storage-client";
import { createBrandAssetRecord } from "@/app/actions/client-assets";
import { File as PrismaFile } from "@prisma/client";

export function BrandAssetsManager({
  clientId,
  userId,
  initialFiles,
}: {
  clientId: string;
  userId: string;
  initialFiles: PrismaFile[];
}) {
  const [files, setFiles] = useState<PrismaFile[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      setIsUploading(true);
      try {
        for (const file of droppedFiles) {
          // 1. Upload to Supabase Storage
          const { url } = await uploadFile(file, `clients/${clientId}/${userId}`);

          // 2. Insert record via Server Action
          const newRecord = await createBrandAssetRecord({
            clientId,
            uploadedById: userId,
            filename: file.name,
            originalName: file.name,
            fileUrl: url,
            mimeType: file.type,
            fileSize: file.size,
          });

          setFiles((prev) => [newRecord, ...prev]);
        }
      } catch (error: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(error?.message || "Failed to upload brand asset.", { duration: 5000 });
      } finally {
        setIsUploading(false);
      }
    },
    [clientId, userId]
  );

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { url } = await uploadFile(file, `clients/${clientId}/${userId}`);
        const newRecord = await createBrandAssetRecord({
          clientId,
          uploadedById: userId,
          filename: file.name,
          originalName: file.name,
          fileUrl: url,
          mimeType: file.type,
          fileSize: file.size,
        });

        setFiles((prev) => [newRecord, ...prev]);
      }
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to upload brand asset.", { duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`brutalist-border p-12 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
          ${isDragging ? "bg-primary/10 border-primary" : "bg-card-muted hover:bg-neutral-200"}
        `}
      >
        <input 
          type="file" 
          multiple 
          onChange={handleManualUpload} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <span className="material-symbols-outlined text-4xl mb-4 text-card-text">
          {isUploading ? "cloud_upload" : "Upload File"}
        </span>
        <h3 className="font-headline tracking-widest uppercase text-card-text text-lg">
          {isUploading ? "UPLOADING_ASSETS..." : "DROP_ASSETS_HERE"}
        </h3>
        <p className="font-mono text-xs uppercase text-muted-foreground mt-2">
          or click to browse local filesystem
        </p>
      </div>

      {/* File Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.length === 0 ? (
          <div className="col-span-full py-8 text-center border-t-2 border-dashed border-neutral-300">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              NO_BRAND_ASSETS_LOCATED
            </p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="brutalist-border p-4 bg-card hover:bg-surface-container-high flex flex-col justify-between group">
              <div className="flex items-start justify-between mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">
                  {file.mimeType.includes("image") ? "image" : file.mimeType.includes("pdf") ? "picture_as_pdf" : "description"}
                </span>
                <a 
                  href={file.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rounded-lg bg-card-muted p-2 hover:bg-primary hover:text-white transition-colors flex"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                </a>
              </div>
              <div>
                <p className="font-headline text-sm truncate uppercase tracking-tight" title={file.filename}>
                  {file.filename}
                </p>
                <div className="flex justify-between items-center mt-2 font-mono text-[10px] text-muted-foreground">
                  <span>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
