"use client";

import { useState, useRef } from "react";
import { updateProfile } from "@/app/actions/profile";
import { requestDepartmentChange } from "@/app/actions/users";
import { uploadFile } from "@/lib/storage-client";
import type { Role, Department } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "MANAGEMENT",
  EMPLOYEE: "EMPLOYEE",
};

const DEPARTMENTS: Department[] = ["STRATEGY", "EDITOR", "DESIGN", "TECH", "AI"];

interface ProfileEditFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: Role;
    department: Department | null;
    createdAt: Date;
  };
  pendingDeptRequest?: { id: string; requestedDept: Department; createdAt: Date } | null;
}

export function ProfileEditForm({ user, pendingDeptRequest }: ProfileEditFormProps) {
  const [name, setName] = useState(user.name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.image);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [requestingDept, setRequestingDept] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | "">("")
  const [pendingReq, setPendingReq] = useState(pendingDeptRequest ?? null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      showToast("error", "Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be under 5MB.");
      return;
    }

    // Instant preview
    setPreviewUrl(URL.createObjectURL(file));

    // Upload to R2
    setUploading(true);
    try {
      const { url } = await uploadFile(file, `avatars/${user.id}`);
      await updateProfile({ image: url });
      showToast("success", "AVATAR_UPDATED");
    } catch {
      showToast("error", "Upload failed. Try again.");
      setPreviewUrl(user.image);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (trimmed === user.name) return;
    if (trimmed.length < 2) {
      showToast("error", "Name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      showToast("success", "PROFILE_UPDATED");
    } catch {
      showToast("error", "Failed to update. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 brutalist-border px-4 py-3 flex items-center gap-2 text-sm font-label uppercase tracking-wider animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-green-950 text-green-300 border-green-500"
              : "bg-red-950 text-red-300 border-red-500"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.message}
        </div>
      )}

      {/* Avatar Section */}
      <div className="brutalist-border bg-surface-container-lowest p-6">
        <h2 className="font-headline text-xs uppercase tracking-widest text-on-surface/50 mb-4">
          PROFILE_AVATAR
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden brutalist-border border-2 bg-surface-container-low flex items-center justify-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-on-surface/30">
                  person
                </span>
              )}
            </div>
            {/* Overlay */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-white text-xl">
                {uploading ? "progress_activity" : "photo_camera"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-headline text-sm uppercase tracking-tight text-foreground">
              {user.name}
            </p>
            <p className="font-mono text-[9px] text-on-surface/40 uppercase tracking-widest mt-0.5">
              {uploading ? "UPLOADING..." : "CLICK_AVATAR_TO_CHANGE"}
            </p>
          </div>
        </div>
      </div>

      {/* Name Edit */}
      <div className="brutalist-border bg-surface-container-lowest p-6">
        <h2 className="font-headline text-xs uppercase tracking-widest text-on-surface/50 mb-4">
          DISPLAY_NAME
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="flex-1 px-4 py-2.5 brutalist-border bg-background font-body text-sm text-foreground placeholder:text-on-surface/30 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || name.trim() === user.name}
            className="px-6 py-2.5 brutalist-border bg-primary text-white font-label text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center"
          >
            <span className="material-symbols-outlined text-sm">
              {saving ? "progress_activity" : "save"}
            </span>
            {saving ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>

      {/* Read-Only Info */}
      <div className="brutalist-border bg-surface-container-lowest p-6">
        <h2 className="font-headline text-xs uppercase tracking-widest text-on-surface/50 mb-4">
          ACCOUNT_DETAILS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40 mb-1">EMAIL</p>
            <p className="font-body text-sm text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40 mb-1">ROLE</p>
            <p className="font-body text-sm text-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40 mb-1">DEPARTMENT</p>
            <p className="font-body text-sm text-foreground">{user.department ?? "—"}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40 mb-1">MEMBER_SINCE</p>
            <p className="font-body text-sm text-foreground">{joinDate}</p>
          </div>
        </div>
      </div>

      {/* Department Change Request (non-SUPER_ADMIN only) */}
      {user.role !== "SUPER_ADMIN" && (
        <div className="brutalist-border bg-surface-container-lowest p-6">
          <h2 className="font-headline text-xs uppercase tracking-widest text-on-surface/50 mb-4">
            REQUEST_DEPARTMENT_CHANGE
          </h2>
          {pendingReq ? (
            <div className="flex items-center gap-3 p-3 brutalist-border bg-amber-950/30 border-amber-500/30">
              <span className="material-symbols-outlined text-lg text-amber-400">pending</span>
              <div>
                <p className="font-label text-[10px] uppercase tracking-wider text-amber-300">
                  PENDING_APPROVAL
                </p>
                <p className="font-mono text-[9px] text-on-surface/40 mt-0.5">
                  Requested: {pendingReq.requestedDept} — waiting for Director approval
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value as Department)}
                className="flex-1 px-4 py-2.5 brutalist-border bg-background font-body text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.filter((d) => d !== user.department).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedDept) return;
                  setRequestingDept(true);
                  try {
                    await requestDepartmentChange(selectedDept as Department);
                    setPendingReq({ id: "new", requestedDept: selectedDept as Department, createdAt: new Date() });
                    setSelectedDept("");
                    showToast("success", "REQUEST_SUBMITTED");
                  } catch (e: any) {
                    showToast("error", e?.message || "Failed to submit request.");
                  } finally {
                    setRequestingDept(false);
                  }
                }}
                disabled={!selectedDept || requestingDept}
                className="px-6 py-2.5 brutalist-border bg-primary text-white font-label text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center"
              >
                <span className="material-symbols-outlined text-sm">
                  {requestingDept ? "progress_activity" : "send"}
                </span>
                {requestingDept ? "SENDING..." : "REQUEST"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
