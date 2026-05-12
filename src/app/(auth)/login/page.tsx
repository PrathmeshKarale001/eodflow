"use client";

import { useState, Suspense } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/overview";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message || "INVALID_SYS_CREDENTIALS");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[100dvh] px-4 py-8 sm:py-12">
      <div className="w-full max-w-md brutalist-border bg-surface-container-lowest p-5 sm:p-8 flex flex-col relative z-10 box-border">
        
        {/* Decorative ID */}
        <div className="absolute top-0 right-0 p-2 border-l border-b border-on-surface/10 font-label text-[8px] text-on-surface/30 uppercase">
          ID: 0xAUTH-SYS-REQ
        </div>

        {/* Logo / Header */}
        <div className="mb-10 mt-4">
          <span className="text-primary font-label text-[10px] font-bold uppercase block mb-4">ACCESS_TERMINAL</span>
          <h1 className="text-3xl font-headline font-extrabold uppercase leading-none text-white">
            Identify<br />Yourself.
          </h1>
          <p className="mt-4 text-[10px] text-outline uppercase font-label tracking-widest leading-relaxed border-l-2 border-primary pl-3">
            End Of Day Media — We Get It Done
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="border border-error bg-error/10 px-4 py-3 text-[10px] font-label uppercase text-error tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
              USER_ID [EMAIL]
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@eodmedia.in"
              required
              className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-[10px] font-label text-on-surface/50 uppercase tracking-widest">
              SECURITY_KEY [PASSWORD]
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-none brutalist-border bg-transparent px-4 py-3 text-sm text-white placeholder:text-on-surface/20 focus:border-primary-container focus:outline-none focus:bg-card/5 transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-white px-6 py-4 font-headline uppercase text-sm font-bold flex items-center justify-center gap-3 hover:bg-card hover:text-black transition-all mono-clip disabled:opacity-50 disabled:hover:bg-primary-container disabled:hover:text-white"
            >
              {loading ? "AUTHENTICATING..." : "INITIALIZE_SESSION"} <span className="material-symbols-outlined text-[18px]">login</span>
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-on-surface/10 pt-4 flex justify-between items-center text-[10px] font-label uppercase text-on-surface/30">
          <span>Sys_Admin Check:</span>
          <span className="text-tertiary">INVITE_ONLY</span>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
