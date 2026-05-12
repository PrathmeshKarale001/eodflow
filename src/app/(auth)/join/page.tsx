"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { validateInvitation, acceptInvitation } from "@/app/actions/invitations";

// ---------------------------------------------------------------------------
// Types
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
    setCodeLoading(false);
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
      await acceptInvitation({
        token,
        password,
        ...(invitation?.type === "CODE" ? { name: name.trim(), email: email.trim() } : {}),
      });

      // Auto sign-in after account creation
      const signInEmail = invitation?.type === "LINK" ? invitation.email! : email.trim();
      const result = await signIn.email({ email: signInEmail, password });

      if (result.error) {
        // Account created but auto-login failed — redirect to login
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

  // ─── ROLE LABELS ──────────────────────────────────────────────────────────
  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "POC",
    EMPLOYEE: "EMPLOYEE",
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="data-grid gap-4 flex-1 items-center justify-center relative min-h-[calc(100vh-8rem)]">
      <div className="col-span-12 md:col-span-6 md:col-start-4 lg:col-span-4 lg:col-start-5 brutalist-border bg-surface-container-lowest p-6 sm:p-8 flex flex-col relative z-10 box-border">

        {/* Decorative ID */}
        <div className="absolute top-0 right-0 p-2 border-l border-b border-on-surface/10 font-label text-[8px] uppercase">
          {step === "enter-code" && <span className="text-primary">CODE_ENTRY</span>}
          {step === "set-password" && <span className="text-primary">INVITE_VERIFIED</span>}
          {step === "loading" && <span className="text-outline">VALIDATING...</span>}
          {step === "error" && <span className="text-error">INVITE_INVALID</span>}
          {step === "success" && <span className="text-primary">ACCOUNT_CREATED</span>}
        </div>

        {/* Header */}
        <div className="mb-8 mt-4">
          <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">ACCESS_TERMINAL</span>
          <h1 className="text-3xl font-headline font-extrabold uppercase leading-none text-white">
            {step === "enter-code" && <>Join<br />The Team.</>}
            {step === "set-password" && <>Set Your<br />Password.</>}
            {step === "loading" && <>Verifying<br />Invite...</>}
            {step === "error" && <>Invite<br />Invalid.</>}
            {step === "success" && <>Welcome<br />Aboard.</>}
          </h1>
          <p className="mt-4 text-[10px] text-outline uppercase font-label tracking-widest leading-relaxed border-l-2 border-primary pl-3">
            {step === "enter-code" && "Enter your invite code to get started"}
            {step === "set-password" && "Choose a secure password for your account"}
            {step === "loading" && "Validating your invitation..."}
            {step === "error" && "Something went wrong with your invitation"}
            {step === "success" && "Your account has been created successfully"}
          </p>
        </div>

        {/* Error display */}
        {error && step !== "loading" && (
          <div className="border border-error bg-error/10 px-4 py-3 text-[10px] font-label uppercase text-error tracking-widest mb-6">
            {error}
          </div>
        )}

        {/* ── LOADING STATE ──────────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex items-center gap-3 py-8">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-label text-[10px] text-outline uppercase tracking-widest">
              VALIDATING_INVITATION_TOKEN...
            </span>
          </div>
        )}

        {/* ── ENTER CODE ─────────────────────────────────────────────── */}
        {step === "enter-code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="invite-code" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                INVITE_CODE
              </label>
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EOD-XXXX-XXXX"
                required
                className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all font-mono tracking-widest text-center text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={codeLoading || !code.trim()}
              className="w-full bg-primary-container text-white px-6 py-4 font-headline uppercase text-sm font-bold flex items-center justify-center gap-3 hover:bg-card hover:text-black transition-all mono-clip disabled:opacity-50"
            >
              {codeLoading ? "VALIDATING..." : "VERIFY_CODE"}
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </button>

            <div className="border-t border-on-surface/10 pt-4 text-center">
              <p className="text-[10px] font-label text-on-surface/30 uppercase tracking-widest">
                Got a link instead? Check your email for a direct invite.
              </p>
            </div>
          </form>
        )}

        {/* ── SET PASSWORD (shared by both LINK and CODE) ─────────── */}
        {step === "set-password" && invitation && (
          <form onSubmit={handleAccept} className="space-y-5">
            {/* Invitation info badge */}
            <div className="brutalist-border bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label text-[9px] text-outline uppercase tracking-widest">ROLE</span>
                <span className="font-label text-[9px] text-primary font-bold uppercase tracking-widest">
                  {ROLE_LABELS[invitation.role] || invitation.role}
                </span>
              </div>
              {invitation.department && (
                <div className="flex items-center justify-between border-t border-on-surface/10 pt-2">
                  <span className="font-label text-[9px] text-outline uppercase tracking-widest">DEPT</span>
                  <span className="font-label text-[9px] text-foreground uppercase tracking-widest">
                    {invitation.department}
                  </span>
                </div>
              )}
            </div>

            {/* Name (editable for CODE, read-only for LINK) */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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

            {/* Password */}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <label htmlFor="join-confirm" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
                CONFIRM_KEY
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-container text-white px-6 py-4 font-headline uppercase text-sm font-bold flex items-center justify-center gap-3 hover:bg-card hover:text-black transition-all mono-clip disabled:opacity-50"
              >
                {submitting ? "CREATING_ACCOUNT..." : "ACTIVATE_ACCOUNT"}
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              </button>
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
              BACK_TO_LOGIN
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
        <div className="mt-8 border-t border-on-surface/10 pt-4 flex justify-between items-center text-[10px] font-label uppercase text-on-surface/30">
          <span>Sys_Admin Check:</span>
          <span className="text-tertiary">INVITE_ONLY</span>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
