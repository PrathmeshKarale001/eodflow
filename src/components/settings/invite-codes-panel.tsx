"use client";

import { useState, startTransition } from "react";
import { createInviteCode, deactivateInvitation } from "@/app/actions/invitations";
import type { Role, Department, InvitationType } from "@prisma/client";
import { AppSelect } from "@/components/ui/app-select";

interface InvitationData {
  id: string;
  type: InvitationType;
  token: string;
  email: string | null;
  name: string | null;
  role: Role;
  department: Department | null;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  createdBy: { name: string };
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "MANAGEMENT",
  EMPLOYEE: "EMPLOYEE",
};

export function InviteCodesPanel({
  initialInvitations,
}: {
  initialInvitations: InvitationData[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [maxUses, setMaxUses] = useState("5");
  const [expiryDays, setExpiryDays] = useState("7");
  const [codeRole, setCodeRole] = useState<Role>("EMPLOYEE");

  // Filter: show codes only, links only, or all
  const [filter, setFilter] = useState<"all" | "CODE" | "LINK">("all");

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "all") return true;
    return inv.type === filter;
  });

  const activeCodes = invitations.filter(
    (i) => i.type === "CODE" && i.isActive && new Date(i.expiresAt) > new Date() && i.usedCount < i.maxUses
  ).length;

  const handleCreate = () => {
    setIsCreating(true);
    setError(null);
    startTransition(async () => {
      try {
        const result = await createInviteCode({
          maxUses: parseInt(maxUses) || 5,
          expiryDays: parseInt(expiryDays) || 7,
          role: codeRole,
        });
        setNewCode(result.code);
        setShowCreateForm(false);
        window.location.reload();
      } catch (err: any) {
        setError(err.message || "Failed to create code");
      } finally {
        setIsCreating(false);
      }
    });
  };

  const handleDeactivate = (invId: string) => {
    if (!confirm("Revoke this invitation? It can no longer be used.")) return;
    startTransition(async () => {
      try {
        await deactivateInvitation(invId);
        setInvitations((prev) =>
          prev.map((i) => (i.id === invId ? { ...i, isActive: false } : i))
        );
      } catch (err: any) {
        setError(err.message || "Failed to deactivate");
      }
    });
  };

  const getStatus = (inv: InvitationData) => {
    if (!inv.isActive) return { label: "REVOKED", color: "text-error" };
    if (new Date(inv.expiresAt) < new Date()) return { label: "EXPIRED", color: "text-outline" };
    if (inv.usedCount >= inv.maxUses) return { label: "USED_UP", color: "text-outline" };
    return { label: "ACTIVE", color: "text-primary font-bold" };
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="brutalist-border bg-card p-4 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-headline tracking-tighter uppercase text-card-text">
              INVITE_SYSTEM
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/50">
              {activeCodes} ACTIVE CODE{activeCodes !== 1 ? "S" : ""} • {invitations.filter((i) => i.type === "LINK" && i.isActive).length} PENDING LINKS
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mono-clip bg-primary-container text-white px-4 py-2 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">
              {showCreateForm ? "close" : "generating_tokens"}
            </span>
            {showCreateForm ? "CANCEL" : "GENERATE_CODE"}
          </button>
        </div>
      </div>

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

      {/* New Code Created Modal */}
      {newCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="brutalist-border bg-background w-full max-w-sm mx-4 p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">generating_tokens</span>
              <h2 className="font-headline text-sm uppercase tracking-widest text-foreground">
                CODE_GENERATED
              </h2>
            </div>
            <div className="brutalist-border bg-surface-container-lowest p-6 text-center">
              <p className="font-mono text-2xl text-primary font-bold tracking-[0.2em]">{newCode}</p>
            </div>
            <p className="font-label text-[9px] text-outline uppercase tracking-widest text-center">
              Share this code with your team
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 brutalist-border py-2.5 font-headline text-xs uppercase text-foreground hover:bg-card/10 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                {copied ? "COPIED!" : "COPY"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join EOD Flow! Use invite code: ${newCode}\n\nGo to: ${window.location.origin}/join`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366]/20 text-[#25D366] brutalist-border px-4 py-2.5 font-headline text-xs uppercase hover:bg-[#25D366]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                SHARE
              </a>
            </div>
            <button
              onClick={() => setNewCode(null)}
              className="w-full brutalist-border py-2 font-label text-[10px] text-outline uppercase tracking-widest hover:bg-card/5 transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Create Code Form */}
      {showCreateForm && (
        <div className="brutalist-border bg-surface-container-lowest p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="font-headline text-[10px] uppercase tracking-widest text-foreground">
            GENERATE_INVITE_CODE
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">MAX_USES</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full h-11 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">EXPIRES_IN_DAYS</label>
              <input
                type="number"
                min="1"
                max="90"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="w-full h-11 brutalist-border bg-transparent px-3 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[9px] text-outline uppercase tracking-widest block">DEFAULT_ROLE</label>
              <AppSelect
                options={[
                  { value: "EMPLOYEE", label: "EMPLOYEE" },
                  { value: "ADMIN", label: "MANAGEMENT" },
                ]}
                value={codeRole}
                onChange={(val) => setCodeRole(val as Role)}
                placeholder=""
                className="h-11"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="mono-clip bg-primary-container text-white px-6 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">generating_tokens</span>
            {isCreating ? "GENERATING..." : "GENERATE"}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "CODE", "LINK"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 font-label text-[9px] uppercase tracking-widest transition-colors ${
              filter === f
                ? "bg-primary/20 text-primary brutalist-border"
                : "text-outline hover:text-foreground"
            }`}
          >
            {f === "all" ? "ALL" : f === "CODE" ? "CODES" : "LINKS"}
            <span className="ml-1.5 text-[8px]">
              ({f === "all" ? invitations.length : invitations.filter((i) => i.type === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Invitations Table */}
      {filteredInvitations.length === 0 ? (
        <div className="brutalist-border p-8 text-center">
          <span className="material-symbols-outlined text-3xl text-outline mb-2">inbox</span>
          <p className="font-label text-[10px] text-outline uppercase tracking-widest">
            No invitations found
          </p>
        </div>
      ) : (
        <div className="brutalist-border overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low border-b border-on-surface/10">
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">TYPE</th>
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">TOKEN / EMAIL</th>
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">ROLE</th>
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">USES</th>
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">EXPIRES</th>
                  <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">STATUS</th>
                  <th className="px-4 py-3 text-right font-label text-[9px] uppercase tracking-widest text-outline">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {filteredInvitations.map((inv) => {
                  const status = getStatus(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-card/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[8px] font-label uppercase tracking-widest ${inv.type === "CODE" ? "bg-tertiary/20 text-tertiary" : "bg-primary/20 text-primary"}`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.type === "CODE" ? (
                          <span className="font-mono text-sm text-foreground tracking-widest">{inv.token}</span>
                        ) : (
                          <div>
                            <span className="font-headline text-[11px] text-foreground uppercase">{inv.name}</span>
                            <span className="block font-label text-[9px] text-outline lowercase">{inv.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-label text-[9px] text-foreground uppercase">{ROLE_LABELS[inv.role]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-foreground">
                          {inv.usedCount}/{inv.maxUses}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-label text-[9px] text-outline uppercase">
                          {new Date(inv.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-label text-[9px] uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.isActive && new Date(inv.expiresAt) > new Date() && inv.usedCount < inv.maxUses && (
                          <button
                            onClick={() => handleDeactivate(inv.id)}
                            className="brutalist-border px-3 py-1.5 font-label text-[9px] uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                          >
                            REVOKE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="block md:hidden divide-y divide-on-surface/10">
            {filteredInvitations.map((inv) => {
              const status = getStatus(inv);
              return (
                <div key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-label uppercase tracking-widest ${inv.type === "CODE" ? "bg-tertiary/20 text-tertiary" : "bg-primary/20 text-primary"}`}>
                        {inv.type}
                      </span>
                      <span className={`font-label text-[9px] uppercase tracking-widest ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-outline">
                      {inv.usedCount}/{inv.maxUses} used
                    </span>
                  </div>
                  {inv.type === "CODE" ? (
                    <p className="font-mono text-lg text-foreground tracking-widest">{inv.token}</p>
                  ) : (
                    <div>
                      <p className="font-headline text-[12px] text-foreground uppercase">{inv.name}</p>
                      <p className="font-label text-[10px] text-outline lowercase">{inv.email}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-label text-[9px] text-outline uppercase">
                      Expires {new Date(inv.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                    {inv.isActive && new Date(inv.expiresAt) > new Date() && inv.usedCount < inv.maxUses && (
                      <button
                        onClick={() => handleDeactivate(inv.id)}
                        className="brutalist-border px-3 py-1.5 font-label text-[9px] uppercase tracking-widest text-error active:bg-error/10"
                      >
                        REVOKE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
