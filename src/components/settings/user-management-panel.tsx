"use client";

import { useState, startTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createInviteLink } from "@/app/actions/invitations";
import { deactivateUser, reactivateUser, deleteUser, changeUserDepartment, changeUserRole } from "@/app/actions/users";
import type { Role, Department } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

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
  ADMIN: "MANAGEMENT",
  EMPLOYEE: "EMPLOYEE",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-error/20 text-error",
  ADMIN: "bg-primary/20 text-primary",
  EMPLOYEE: "bg-outline/20 text-outline",
};

const DEPARTMENTS: Department[] = ["STRATEGY", "EDITOR", "DESIGN", "TECH", "AI"];
const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"];

export function UserManagementPanel({
  initialUsers,
  currentUserId,
  currentUserRole,
}: {
  initialUsers: UserData[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState(initialUsers);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "invite") {
      setShowInviteForm(true);
    }
  }, [searchParams]);

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE");
  const [inviteDept, setInviteDept] = useState<Department>("DESIGN");

  // Invite success modal state (shown after sending invite)
  const [inviteResult, setInviteResult] = useState<{
    name: string;
    email: string;
    joinUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Credentials modal state (shown after reactivate)
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [credCopied, setCredCopied] = useState(false);

  // ── Invite (Magic Link) ────────────────────────────────────────────────────
  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const nameSnap = inviteName.trim();
    const emailSnap = inviteEmail.trim();
    startTransition(async () => {
      try {
        const result = await createInviteLink({
          name: nameSnap,
          email: emailSnap,
          role: inviteRole,
          department: inviteDept,
        });
        setInviteResult({ name: nameSnap, email: emailSnap, joinUrl: result.joinUrl });
        setShowInviteForm(false);
        setInviteName("");
        setInviteEmail("");
      } catch (err: any) {
        setError(err.message || "Failed to send invite");
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

  // ── Role Change (SUPER_ADMIN only) ──────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await changeUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      setError(err.message || "Failed to change role");
    }
  };

  // ── Copy helpers ──────────────────────────────────────────────────────────
  const buildInviteShareMessage = (r: typeof inviteResult) =>
    `Hi ${r!.name}! You've been invited to EOD Flow.\n\nClick this link to set up your account:\n${r!.joinUrl}\n\nThis link expires in 48 hours.`;

  const buildCredShareMessage = (c: typeof credentials) =>
    `Hi ${c!.name}! Your EOD Flow account has been reactivated.\n\nLogin: ${window.location.origin}/login\nEmail: ${c!.email}\nTemp Password: ${c!.password}\n\nPlease change your password after first login.`;

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

      {/* ── Invite Success Modal ──────────────────────────────────────────── */}
      {inviteResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="brutalist-border bg-background w-full max-w-md mx-4 p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">send</span>
              <div>
                <h2 className="font-headline text-sm uppercase tracking-widest text-foreground">
                  Invite Sent
                </h2>
                <p className="font-label text-[11px] text-outline uppercase tracking-widest">
                  Email sent via Resend • Link valid for 48h
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="brutalist-border bg-surface-container-lowest p-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-outline text-[10px] uppercase tracking-widest">TO</span>
                <span className="text-foreground">{inviteResult.email}</span>
              </div>
              <div className="border-t border-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-outline text-[10px] uppercase tracking-widest">NAME</span>
                <span className="text-foreground font-bold">{inviteResult.name}</span>
              </div>
              <div className="border-t border-white/10" />
              <div>
                <span className="text-outline text-[10px] uppercase tracking-widest block mb-2">Invite Link</span>
                <span className="text-primary text-[11px] break-all">{inviteResult.joinUrl}</span>
              </div>
            </div>

            <p className="font-label text-[11px] text-outline uppercase tracking-widest">
              📧 Email was sent automatically. Share the link below as a backup.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildInviteShareMessage(inviteResult));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-2 brutalist-border py-2.5 font-headline text-xs uppercase text-foreground hover:bg-card/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : "Copy Message"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildInviteShareMessage(inviteResult))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366]/20 text-[#25D366] brutalist-border px-4 py-2.5 font-headline text-xs uppercase hover:bg-[#25D366]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                WhatsApp
              </a>
            </div>

            <button
              onClick={() => {
                setInviteResult(null);
                window.location.reload();
              }}
              className="w-full brutalist-border py-2 font-label text-[10px] text-outline uppercase tracking-widest hover:bg-card/5 transition-colors"
            >
              Done — Close
            </button>
          </div>
        </div>
      )}

      {/* ── Reactivate Credentials Modal ──────────────────────────────────── */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="brutalist-border bg-background w-full max-w-md mx-4 p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">key</span>
              <div>
                <h2 className="font-headline text-sm uppercase tracking-widest text-foreground">
                  User Reactivated
                </h2>
                <p className="font-label text-[11px] text-outline uppercase tracking-widest">
                  Share these credentials with the user
                </p>
              </div>
            </div>

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

            <p className="font-label text-[11px] text-outline uppercase tracking-widest">
              ⚠ This password is shown ONCE. Copy and share it now.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(buildCredShareMessage(credentials));
                  setCredCopied(true);
                  setTimeout(() => setCredCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-2 brutalist-border py-2.5 font-headline text-xs uppercase text-foreground hover:bg-card/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {credCopied ? "check" : "content_copy"}
                </span>
                {credCopied ? "Copied!" : "Copy Message"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildCredShareMessage(credentials))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366]/20 text-[#25D366] brutalist-border px-4 py-2.5 font-headline text-xs uppercase hover:bg-[#25D366]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                WhatsApp
              </a>
            </div>

            <button
              onClick={() => setCredentials(null)}
              className="w-full brutalist-border py-2 font-label text-[10px] text-outline uppercase tracking-widest hover:bg-card/5 transition-colors"
            >
              Done — Close
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
          className="rounded-lg bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">
            {showInviteForm ? "close" : "person_add"}
          </span>
          {showInviteForm ? "Cancel" : "Invite User"}
        </button>
      </div>

      {/* ── Invite Form ────────────────────────────────────────────────────── */}
      {showInviteForm && (
        <div className="brutalist-border bg-surface-container-lowest p-4 md:p-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-foreground">
              INVITE VIA MAGIC LINK
            </h3>
            <span className="font-label text-[10px] text-primary uppercase tracking-widest">
              📧 Email sent automatically
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
            <div className="space-y-1.5">
              <label className="font-label text-[11px] text-outline uppercase tracking-widest block">
                Full Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full h-11 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] text-outline uppercase tracking-widest block">
                EMAIL
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full h-11 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="user@eodmedia.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] text-outline uppercase tracking-widest block">
                ROLE
              </label>
              <AppSelect
                options={ROLES
                  .filter((r) => {
                    if (currentUserRole === "ADMIN") return r === "EMPLOYEE";
                    return true;
                  })
                  .map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                value={inviteRole}
                onChange={(val) => setInviteRole(val as Role)}
                placeholder=""
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] text-outline uppercase tracking-widest block">
                DEPARTMENT
              </label>
              <AppSelect
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                value={inviteDept}
                onChange={(val) => setInviteDept(val as Department)}
                placeholder=""
                className="h-11"
              />
            </div>
          </div>
          <button
            onClick={handleInvite}
            disabled={isSubmitting || !inviteName.trim() || !inviteEmail.trim()}
            className="w-full sm:w-auto rounded-lg bg-primary-container text-white px-8 py-4 sm:py-3 font-headline text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            {isSubmitting ? "Sending..." : "Send Magic Link"}
          </button>
        </div>
      )}


      {/* ── Users - Desktop Table / Mobile List ────────────────────────────────── */}
      <div className="brutalist-border overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-on-surface/10">
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-outline">USER</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-outline">ROLE</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-outline">DEPT</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-outline">STATUS</th>
                <th className="px-4 py-3 text-left font-label text-[11px] uppercase tracking-widest text-outline">Last Login</th>
                <th className="px-4 py-3 text-right font-label text-[11px] uppercase tracking-widest text-outline">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-on-surface/5">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-card/5 transition-colors ${!user.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-primary-container/30 text-[10px] font-headline font-bold text-primary uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-headline text-[11px] uppercase tracking-tight text-foreground">
                          {user.name}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-[10px] text-primary">(YOU)</span>
                          )}
                        </p>
                        <p className="font-label text-[11px] text-outline lowercase">{user.email}</p>
                      </div>

                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {currentUserRole === "SUPER_ADMIN" && user.id !== currentUserId && user.role !== "SUPER_ADMIN" ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="bg-transparent brutalist-border px-2 py-1 font-label text-[11px] text-foreground uppercase tracking-wide cursor-pointer focus:outline-none focus:border-primary"
                      >
                        <option value="ADMIN">MANAGEMENT</option>
                        <option value="EMPLOYEE">EMPLOYEE</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 text-[10px] font-label uppercase tracking-widest ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {currentUserRole === "SUPER_ADMIN" && user.id !== currentUserId ? (
                      <select
                        value={user.department ?? ""}
                        onChange={async (e) => {
                          const newDept = e.target.value as Department;
                          if (!newDept) return;
                          try {
                            await changeUserDepartment(user.id, newDept);
                            setUsers((prev) =>
                              prev.map((u) => (u.id === user.id ? { ...u, department: newDept } : u))
                            );
                          } catch (err: any) {
                            setError(err.message || "Failed to change department");
                          }
                        }}
                        className="bg-transparent brutalist-border px-2 py-1 font-label text-[11px] text-foreground uppercase tracking-wide cursor-pointer focus:outline-none focus:border-primary"
                      >
                        <option value="">—</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-label text-[11px] text-foreground uppercase">
                        {user.department ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 font-label text-[11px] uppercase tracking-widest ${user.isActive ? "text-primary font-bold" : "text-error"}`}>
                      <span className={`w-1.5 h-1.5 ${user.isActive ? "bg-primary" : "bg-error"}`} />
                      {user.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-label text-[11px] text-outline uppercase">
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
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        {user.isActive ? (
                          <button
                            onClick={() => handleDeactivate(user.id, user.name)}
                            className="brutalist-border px-3 py-1.5 font-label text-[11px] uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                          >
                            DEACTIVATE
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(user.id)}
                            className="brutalist-border px-3 py-1.5 font-label text-[11px] uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                          >
                            REACTIVATE
                          </button>
                        )}
                        {currentUserRole === "SUPER_ADMIN" && (
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            title="Permanently delete user"
                            className="w-8 h-8 flex items-center justify-center brutalist-border text-error/60 hover:text-error hover:bg-error/10 transition-colors"
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

        {/* Mobile List View */}
        <div className="block lg:hidden divide-y divide-on-surface/10">
          {users.map((user) => (
            <div
              key={user.id}
              className={`p-4 bg-surface-container-lowest ${!user.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary font-headline text-sm uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-headline text-[13px] uppercase tracking-tight text-foreground leading-none">
                      {user.name}
                      {user.id === currentUserId && <span className="ml-1.5 text-[11px] text-primary">(YOU)</span>}
                    </p>
                    <p className="font-label text-[10px] text-outline lowercase mt-1">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {currentUserRole === "SUPER_ADMIN" && user.id !== currentUserId && user.role !== "SUPER_ADMIN" ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          className="bg-transparent brutalist-border px-1.5 py-0.5 font-label text-[10px] text-foreground uppercase tracking-wide cursor-pointer focus:outline-none focus:border-primary"
                        >
                          <option value="ADMIN">MANAGEMENT</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      ) : (
                        <span className={`px-1.5 py-0.5 text-[10px] font-label uppercase tracking-widest ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      )}
                      <span className="font-label text-[10px] text-outline uppercase tracking-widest">
                        {user.department ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`flex items-center gap-1 font-label text-[11px] uppercase tracking-widest ${user.isActive ? "text-primary font-bold" : "text-error"}`}>
                  <span className={`w-1.5 h-1.5 ${user.isActive ? "bg-primary" : "bg-error"}`} />
                  {user.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              {/* Mobile Actions */}
              {user.id !== currentUserId && (
                <div className="flex items-center justify-between pt-4 border-t border-on-surface/5">
                  <div className="flex flex-col">
                    <span className="font-label text-[10px] text-outline uppercase tracking-widest">Last Login</span>
                    <span className="font-mono text-[11px] text-on-surface">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "NEVER"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isActive ? (
                      <button
                        onClick={() => handleDeactivate(user.id, user.name)}
                        className="brutalist-border px-3 py-2 font-label text-[11px] uppercase tracking-widest text-error active:bg-error/10 transition-colors"
                      >
                        DEACTIVATE
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="brutalist-border px-3 py-2 font-label text-[11px] uppercase tracking-widest text-primary active:bg-primary/10 transition-colors"
                      >
                        REACTIVATE
                      </button>
                    )}
                    {currentUserRole === "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="w-9 h-9 flex items-center justify-center brutalist-border text-error/60 active:bg-error/10"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile Users Card List ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {users.map((user) => (
          <div
            key={user.id}
            className={`brutalist-border bg-card p-4 space-y-3 transition-colors ${!user.isActive ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-container/30 text-[10px] font-headline font-bold text-primary uppercase flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-headline text-[11px] uppercase tracking-tight text-foreground font-bold">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-[11px] text-primary">(YOU)</span>
                    )}
                  </p>
                  <p className="font-label text-[10px] text-outline">{user.email}</p>
                </div>
              </div>
              
              <span className={`flex items-center gap-1 font-label text-[10px] uppercase tracking-widest ${user.isActive ? "text-primary" : "text-error"}`}>
                <span className={`w-1.5 h-1.5 ${user.isActive ? "bg-primary" : "bg-error"}`} />
                {user.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {currentUserRole === "SUPER_ADMIN" && user.id !== currentUserId && user.role !== "SUPER_ADMIN" ? (
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                  className="bg-transparent brutalist-border px-1.5 py-0.5 font-label text-[10px] text-foreground uppercase tracking-wide cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="ADMIN">MANAGEMENT</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                </select>
              ) : (
                <span className={`px-1.5 py-0.5 text-[10px] font-label uppercase tracking-widest ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              )}
              {user.department && (
                <span className="px-1.5 py-0.5 text-[10px] font-label uppercase tracking-widest bg-surface-container-high text-foreground">
                  {user.department}
                </span>
              )}
            </div>

            <div className="text-[11px] font-label text-outline uppercase tracking-wider flex justify-between border-t border-white/5 pt-2 font-mono">
              <span>Last Login</span>
              <span>
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "NEVER"}
              </span>
            </div>

            {user.id !== currentUserId && (
              <div className="flex gap-2 pt-1 border-t border-white/5">
                {user.isActive ? (
                  <button
                    onClick={() => handleDeactivate(user.id, user.name)}
                    className="flex-1 brutalist-border py-2 text-center font-label text-[11px] uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                  >
                    DEACTIVATE
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(user.id)}
                    className="flex-1 brutalist-border py-2 text-center font-label text-[11px] uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                  >
                    REACTIVATE
                  </button>
                )}

                {currentUserRole === "SUPER_ADMIN" && (
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    title="Permanently delete user"
                    className="w-9 h-9 flex items-center justify-center brutalist-border text-error/60 hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
