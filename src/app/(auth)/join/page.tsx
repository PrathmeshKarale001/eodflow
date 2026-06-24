"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { validateInvitation, acceptInvitation } from "@/app/actions/invitations";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type InvitationData = {
  id: string;
  type: "LINK" | "CODE";
  email: string | null;
  name: string | null;
  role: string;
  department: string | null;
};

type Step = "loading" | "enter-code" | "set-password" | "error" | "success";

const DEPARTMENTS = ["STRATEGY", "EDITOR", "DESIGN", "TECH", "AI"] as const;
const ROLES = ["EMPLOYEE", "ADMIN"] as const;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "MANAGEMENT",
  EMPLOYEE: "EMPLOYEE",
};

// ---------------------------------------------------------------------------
// Main Join Form
// ---------------------------------------------------------------------------

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [step, setStep] = useState<Step>(tokenFromUrl ? "loading" : "enter-code");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");

  // Code entry
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // Registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<string>("DESIGN");
  const [selectedRole, setSelectedRole] = useState<string>("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validate magic link token on mount
  useEffect(() => {
    if (!tokenFromUrl) return;

    async function validate() {
      const result = await validateInvitation(tokenFromUrl!);
      if (result.valid && result.invitation) {
        setInvitation(result.invitation as InvitationData);
        setName(result.invitation.name || "");
        setEmail(result.invitation.email || "");
        if (result.invitation.department) {
          setDepartment(result.invitation.department);
        }
        setStep("set-password");
      } else {
        const messages: Record<string, string> = {
          INVALID_TOKEN: "This invite link is invalid or has already been used.",
          DEACTIVATED: "This invitation has been revoked by an admin.",
          EXPIRED: "This invite link has expired. Please request a new one from your admin.",
          MAX_USES_REACHED: "This invite link has already been used.",
        };
        setError(messages[result.error!] || "Invalid invitation.");
        setStep("error");
      }
    }
    validate();
  }, [tokenFromUrl]);

  // Validate invite code
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCodeLoading(true);
    setError("");

    try {
      const result = await validateInvitation(code.trim().toUpperCase());
      if (result.valid && result.invitation) {
        setInvitation(result.invitation as InvitationData);
        setStep("set-password");
      } else {
        const messages: Record<string, string> = {
          INVALID_TOKEN: "Invalid invite code. Please check and try again.",
          DEACTIVATED: "This invite code has been revoked.",
          EXPIRED: "This invite code has expired.",
          MAX_USES_REACHED: "This invite code has reached its maximum uses.",
        };
        setError(messages[result.error!] || "Invalid code.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to validate code. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  }

  // Accept invitation (set password + create account)
  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (invitation?.type === "CODE" && (!name.trim() || !email.trim())) {
      setError("Name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const token = invitation?.type === "LINK" ? tokenFromUrl! : code.trim().toUpperCase();
      const res = await acceptInvitation({
        token,
        password,
        ...(invitation?.type === "CODE"
          ? { name: name.trim(), email: email.trim(), department, role: selectedRole }
          : {}),
      });

      if (!res.success) {
        setError(res.error || "Failed to create account.");
        setSubmitting(false);
        return;
      }

      // Auto sign-in after account creation
      const signInEmail = invitation?.type === "LINK" ? invitation.email! : email.trim();
      const result = await signIn.email({ email: signInEmail, password });

      if (result.error) {
        // Account was created successfully but auto-login failed — go to login
        setStep("success");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        router.push("/overview");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      setSubmitting(false);
    }
  }

  // Whether department is editable (CODE type without preset dept)
  const canEditDept = invitation?.type === "CODE" || !invitation?.department;

  return (
    <div className="flex items-center justify-center min-h-[100dvh] px-4 py-8 sm:py-12 relative">
      {/* Floating Login Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 font-headline text-[10px] uppercase text-on-surface/40 hover:text-white transition-all tracking-widest border border-on-surface/10 px-4 py-2 hover:border-primary"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          Login Terminal
        </Link>
      </div>

      <div className={`w-full ${step === "set-password" && invitation ? "max-w-3xl" : "max-w-md"} brutalist-border bg-surface-container-lowest p-5 sm:p-8 flex flex-col relative z-10 box-border transition-all duration-300`}>

        {/* Decorative ID */}
        <div className="absolute top-0 right-0 p-2 border-l border-b border-on-surface/10 font-label text-[10px] uppercase">
          {step === "enter-code" && <span className="text-primary">CODE_ENTRY</span>}
          {step === "set-password" && <span className="text-primary">INVITE_VERIFIED</span>}
          {step === "loading" && <span className="text-outline">VALIDATING...</span>}
          {step === "error" && <span className="text-error">INVITE_INVALID</span>}
          {step === "success" && <span className="text-primary">ACCOUNT_CREATED</span>}
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8 mt-4">
          <span className="text-primary font-label text-[10px] font-bold uppercase block mb-3 sm:mb-4">ACCESS_TERMINAL</span>
          <h1 className="text-2xl sm:text-3xl font-headline font-extrabold uppercase leading-none text-white">
            {step === "enter-code" && <>Join<br />The Team.</>}
            {step === "set-password" && <>Set Your<br />Password.</>}
            {step === "loading" && <>Verifying<br />Invite...</>}
            {step === "error" && <>Invite<br />Invalid.</>}
            {step === "success" && <>Welcome<br />Aboard.</>}
          </h1>
          <p className="mt-3 sm:mt-4 text-[10px] text-outline uppercase font-label tracking-widest leading-relaxed border-l-2 border-primary pl-3">
            {step === "enter-code" && "Enter your invite code to get started"}
            {step === "set-password" && "Choose a secure password for your account"}
            {step === "loading" && "Validating your invitation..."}
            {step === "error" && "Something went wrong with your invitation"}
            {step === "success" && "Your account has been created successfully"}
          </p>
        </div>

        {/* Error display */}
        {error && step !== "loading" && (
          <div className="border border-error bg-error/10 px-3 sm:px-4 py-3 text-[10px] font-label uppercase text-error tracking-widest mb-5 sm:mb-6 break-words">
            {error}
          </div>
        )}

        {/* ── LOADING STATE ──────────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex items-center gap-3 py-8">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-label text-[10px] text-outline uppercase tracking-widest">
              Validating invitation...
            </span>
          </div>
        )}

        {/* ── ENTER CODE ─────────────────────────────────────────────── */}
        {step === "enter-code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label htmlFor="invite-code" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EOD-XXXX-XXXX"
                required
                autoFocus
                className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all font-mono tracking-widest text-center text-base sm:text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={codeLoading || !code.trim()}
              className="w-full bg-primary-container text-white px-6 py-3.5 sm:py-4 font-headline uppercase text-sm font-bold flex items-center justify-center gap-3 hover:bg-card hover:text-black transition-all rounded-lg disabled:opacity-50"
            >
              {codeLoading ? "VALIDATING..." : "VERIFY_CODE"}
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </button>

            <div className="border-t border-on-surface/10 pt-4 text-center space-y-4">
              <p className="text-[10px] font-label text-on-surface/30 uppercase tracking-widest">
                Got a link instead? Check your email for a direct invite.
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 brutalist-border py-2.5 text-[10px] font-headline uppercase text-on-surface/60 hover:text-white hover:border-primary transition-all tracking-widest"
              >
                <span className="material-symbols-outlined text-[14px]">login</span>
                ALREADY_REGISTERED? LOGIN
              </Link>
            </div>
          </form>

        )}

        {/* ── SET PASSWORD (shared by both LINK and CODE) ─────────── */}
        {step === "set-password" && invitation && (
          <form onSubmit={handleAccept} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Invitation info badge */}
              <div className="md:col-span-2 brutalist-border bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label text-[11px] text-outline uppercase tracking-widest">ROLE</span>
                  <span className="font-label text-[11px] text-primary font-bold uppercase tracking-widest">
                    {ROLE_LABELS[invitation.role] || invitation.role}
                  </span>
                </div>
                {invitation.department && invitation.type === "LINK" && (
                  <div className="flex items-center justify-between border-t border-on-surface/10 pt-2">
                    <span className="font-label text-[11px] text-outline uppercase tracking-widest">DEPT</span>
                    <span className="font-label text-[11px] text-foreground uppercase tracking-widest">
                      {invitation.department}
                    </span>
                  </div>
                )}
              </div>

              {/* Left Column: Personal Info / Role & Department Selection */}
              <div className="space-y-4 sm:space-y-5">
                {/* Name (editable for CODE, read-only for LINK) */}
                <div className="space-y-1.5">
                  <label htmlFor="join-name" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                    FULL_NAME
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={invitation.type === "LINK"}
                    required
                    placeholder="Your Name"
                    className={`w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all ${invitation.type === "LINK" ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>

                {/* Email (editable for CODE, read-only for LINK) */}
                <div className="space-y-1.5">
                  <label htmlFor="join-email" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                    EMAIL
                  </label>
                  <input
                    id="join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={invitation.type === "LINK"}
                    required
                    placeholder="you@eodmedia.in"
                    className={`w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all ${invitation.type === "LINK" ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>

                {/* Department — selectable for CODE, read-only for LINK with dept */}
                {canEditDept && (
                  <div className="space-y-1.5">
                    <label htmlFor="join-dept" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                      DEPARTMENT
                    </label>
                    <div className="relative">
                      <select
                        id="join-dept"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all appearance-none cursor-pointer"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d} className="bg-surface-container-lowest text-white">
                            {d}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-sm pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                {/* Role — selectable for CODE type */}
                {invitation.type === "CODE" && (
                  <div className="space-y-1.5">
                    <label htmlFor="join-role" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                      ROLE
                    </label>
                    <div className="relative">
                      <select
                        id="join-role"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all appearance-none cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-surface-container-lowest text-white">
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/40 text-sm pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Security Keys / Password */}
              <div className="space-y-4 sm:space-y-5">
                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="join-password" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                    SECURITY_KEY [PASSWORD]
                  </label>
                  <input
                    id="join-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="join-confirm" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                    Confirm Key
                  </label>
                  <input
                    id="join-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={8}
                    className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-container text-white px-6 py-3.5 sm:py-4 font-headline uppercase text-sm font-bold flex items-center justify-center gap-3 hover:bg-card hover:text-black transition-all rounded-lg disabled:opacity-50"
                >
                  {submitting ? "CREATING_ACCOUNT..." : "ACTIVATE_ACCOUNT"}
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── ERROR STATE ────────────────────────────────────────────── */}
        {step === "error" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-2xl">error</span>
              <p className="font-label text-[10px] uppercase tracking-widest">
                Contact your admin for a new invitation.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full brutalist-border py-3 font-headline text-xs uppercase text-foreground hover:bg-card/5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Login
            </button>
          </div>
        )}

        {/* ── SUCCESS STATE ──────────────────────────────────────────── */}
        {step === "success" && (
          <div className="space-y-6 text-center">
            <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
            <p className="font-label text-[10px] text-outline uppercase tracking-widest">
              Account created. Redirecting to login...
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 border-t border-on-surface/10 pt-4 flex justify-between items-center text-[10px] font-label uppercase text-on-surface/30">
          <span>Sys_Admin Check:</span>
          <span className="text-tertiary">INVITE_ONLY</span>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error Boundary (catches client-side errors and prevents ugly production msgs)
// ---------------------------------------------------------------------------

class JoinErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "Something went wrong." };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[100dvh] px-4">
          <div className="w-full max-w-md brutalist-border bg-surface-container-lowest p-8 text-center space-y-4">
            <span className="material-symbols-outlined text-4xl text-error">error</span>
            <h2 className="font-headline text-xl uppercase text-white">Connection Error</h2>
            <p className="font-mono text-[10px] uppercase text-on-surface/50 tracking-widest">
              {this.state.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-container text-white px-6 py-3 font-headline uppercase text-sm font-bold hover:bg-card hover:text-black transition-all rounded-lg"
            >
              RETRY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Loading Fallback
// ---------------------------------------------------------------------------

function JoinLoading() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] px-4">
      <div className="w-full max-w-md brutalist-border bg-surface-container-lowest p-8">
        <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">ACCESS_TERMINAL</span>
        <div className="h-8 w-48 bg-on-surface/10 animate-pulse mb-4" />
        <div className="h-4 w-64 bg-on-surface/5 animate-pulse mb-8" />
        <div className="h-12 w-full bg-on-surface/5 animate-pulse mb-4" />
        <div className="h-12 w-full bg-primary/20 animate-pulse" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

import React from "react";

export default function JoinPage() {
  return (
    <JoinErrorBoundary>
      <Suspense fallback={<JoinLoading />}>
        <JoinForm />
      </Suspense>
    </JoinErrorBoundary>
  );
}
