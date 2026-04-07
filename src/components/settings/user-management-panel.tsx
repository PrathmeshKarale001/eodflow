"use client";

import { useState, startTransition } from "react";
import { inviteUser, deactivateUser, reactivateUser, deleteUser } from "@/app/actions/users";
import type { Role, Department } from "@prisma/client";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "ACCOUNT_MGR",
  MANAGER: "TEAM_LEAD",
  EMPLOYEE: "TEAM_MEMBER",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-error/20 text-error",
  ADMIN: "bg-primary/20 text-primary",
  MANAGER: "bg-tertiary/20 text-tertiary",
  EMPLOYEE: "bg-outline/20 text-outline",
};

const DEPARTMENTS: Department[] = ["DESIGN", "DEVELOPMENT", "STRATEGY", "MANAGEMENT"];
const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];

export function UserManagementPanel({
  initialUsers,
  currentUserId,
  currentUserRole,
}: {
  initialUsers: UserData[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE");
  const [inviteDept, setInviteDept] = useState<Department>("DESIGN");

  // Credentials modal state (shown after invite OR reactivate)
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Invite ──────────────────────────────────────────────────────────────────
  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const nameSnap = inviteName.trim();
    const emailSnap = inviteEmail.trim();
    startTransition(async () => {
      try {
        const result = await inviteUser({
          name: nameSnap,
          email: emailSnap,
          role: inviteRole,
          department: inviteDept,
        });
        setCredentials({ name: nameSnap, email: emailSnap, password: result.tempPassword });
        setShowInviteForm(false);
        setInviteName("");
        setInviteEmail("");
        window.location.reload();
      } catch (err: any) {
        setError(err.message || "Failed to invite user");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // ── Deactivate ───────────────────────────────────────────────────────────────
  const handleDeactivate = (userId: string, userName: string) => {
    if (!confirm(`Deactivate ${userName}? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      try {
        await deactivateUser(userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
        );
      } catch (err: any) {
        setError(err.message || "Failed to deactivate user");
      }
    });
  };

  // ── Reactivate — generates new temp password ──────────────────────────────
  const handleReactivate = (userId: string) => {
    startTransition(async () => {
      try {
        const result = await reactivateUser(userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u))
        );
        // Show credentials modal so admin can share new password
        setCredentials({
          name: result.name,
          email: result.email,
          password: result.tempPassword,
        });
      } catch (err: any) {
        setError(err.message || "Failed to reactivate user");
      }
    });
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = (userId: string, userName: string) => {
    if (
      !confirm(
        `⚠ PERMANENTLY DELETE ${userName}?\n\nThis cannot be undone. All their data will be removed.`
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err: any) {
        setError(err.message || "Failed to delete user");
      }
    });
  };

  // ── Copy credentials message ─────────────────────────────────────────────
  const buildShareMessage = (c: typeof credentials) =>
    `Hi ${c!.name}! You've been invited to EOD Flow.\n\nLogin: ${window.location.origin}/login\nEmail: ${c!.email}\nTemp Password: ${c!.password}\n\nPlease change your password after first login.`;

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="brutalist-border bg-error/10 p-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="font-label text-[10px] text-error uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-error">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* ── Credentials Modal ──────────────────────────────────────────────── */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="brutalist-border bg-background w-full max-w-md mx-4 p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">key</span>
              <div>
                <h2 className="font-headline text-sm uppercase tracking-widest text-foreground">
                  USER_CREDENTIALS_READY
                </h2>
                <p className="font-label text-[9px] text-outline uppercase tracking-widest">
                  Share these with the user directly
                </p>
              </div>
            </div>

            {/* Credentials box */}
            <div className="brutalist-border bg-surface-container-lowest p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-outline text-[10px] uppercase tracking-widest">NAME</span>
                <span className="text-foreground font-bold">{credentials.name}</span>
              </div>
              <div className="border-t border-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-outline text-[10px] uppercase tracking-widest">EMAIL</span>
                <span className="text-foreground">{credentials.email}</span>
              </div>
              <div className="border-t border-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-outline text-[10px] uppercase tracking-widest">TEMP PASSWORD</span>
                <span className="text-primary font-bold text-base tracking-widest">{credentials.password}</span>
              </div>
            </div>

            <p className="font-label text-[9px] text-outline uppercase tracking-widest">
              ⚠ This password is shown ONCE. Copy and share it now.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildShareMessage(credentials));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-2 brutalist-border py-2.5 font-headline text-xs uppercase text-foreground hover:bg-card/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "COPIED!" : "COPY_MESSAGE"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildShareMessage(credentials))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366]/20 text-[#25D366] brutalist-border px-4 py-2.5 font-headline text-xs uppercase hover:bg-[#25D366]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                WHATSAPP
              </a>
            </div>

            <button
              onClick={() => setCredentials(null)}
              className="w-full brutalist-border py-2 font-label text-[10px] text-outline uppercase tracking-widest hover:bg-card/5 transition-colors"
            >
              DONE — CLOSE
            </button>
          </div>
        </div>
      )}

      {/* ── Actions Bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="font-label text-[10px] text-outline uppercase tracking-widest">
          {users.filter((u) => u.isActive).length} ACTIVE / {users.length} TOTAL
        </span>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="mono-clip bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">
            {showInviteForm ? "close" : "person_add"}
          </span>
          {showInviteForm ? "CANCEL" : "INVITE_USER"}
        </button>
      </div>

      {/* ── Invite Form ────────────────────────────────────────────────────── */}
      {showInviteForm && (
        <div className="brutalist-border bg-surface-container-lowest p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="font-headline text-xs uppercase tracking-widest text-foreground">
            INVITE_NEW_USER
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">
                FULL_NAME
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full h-10 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">
                EMAIL
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full h-10 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="user@eodmedia.com"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">
                ROLE
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full h-10 brutalist-border bg-card px-3 font-label text-[10px] uppercase tracking-widest text-foreground focus:border-primary focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="bg-background">
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">
                DEPARTMENT
              </label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value as Department)}
                className="w-full h-10 brutalist-border bg-card px-3 font-label text-[10px] uppercase tracking-widest text-foreground focus:border-primary focus:outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} className="bg-background">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleInvite}
            disabled={isSubmitting || !inviteName.trim() || !inviteEmail.trim()}
            className="mono-clip bg-primary-container text-white px-6 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            {isSubmitting ? "INVITING..." : "SEND_INVITE"}
          </button>
        </div>
      )}

      {/* ── Users Table ────────────────────────────────────────────────────── */}
      <div className="brutalist-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-low border-b border-on-surface/10">
              <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">USER</th>
              <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">ROLE</th>
              <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">DEPT</th>
              <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">STATUS</th>
              <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">LAST_LOGIN</th>
              <th className="px-4 py-3 text-right font-label text-[9px] uppercase tracking-widest text-outline">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-card/5 transition-colors ${!user.isActive ? "opacity-50" : ""}`}
              >
                {/* User */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary-container/30 text-xs font-headline font-bold text-primary uppercase">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-headline text-xs uppercase tracking-tight text-foreground">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-[8px] text-primary">(YOU)</span>
                        )}
                      </p>
                      <p className="font-label text-[9px] text-outline">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[9px] font-label uppercase tracking-widest ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>

                {/* Dept */}
                <td className="px-4 py-3">
                  <span className="font-label text-[10px] text-foreground uppercase">
                    {user.department ?? "—"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest ${user.isActive ? "text-primary" : "text-error"}`}>
                    <span className={`w-2 h-2 ${user.isActive ? "bg-primary" : "bg-error"}`} />
                    {user.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>

                {/* Last Login */}
                <td className="px-4 py-3">
                  <span className="font-label text-[10px] text-outline">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "NEVER"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  {user.id !== currentUserId && (
                    <div className="flex items-center justify-end gap-2">
                      {user.isActive ? (
                        <button
                          onClick={() => handleDeactivate(user.id, user.name)}
                          className="brutalist-border px-3 py-1.5 font-label text-[9px] uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                        >
                          DEACTIVATE
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(user.id)}
                          className="brutalist-border px-3 py-1.5 font-label text-[9px] uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                        >
                          REACTIVATE
                        </button>
                      )}

                      {/* Delete — SUPER_ADMIN only */}
                      {currentUserRole === "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          title="Permanently delete user"
                          className="w-7 h-7 flex items-center justify-center brutalist-border text-error/60 hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
