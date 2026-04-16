"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/actions/clients";

const PRESET_COLORS = [
  "#6C5CE7", "#00B894", "#E17055", "#0984E3",
  "#FDCB6E", "#E84393", "#00CEC9", "#636E72",
  "#D63031", "#74B9FF",
];

export function CreateClientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [brandColor, setBrandColor] = useState("#6C5CE7");
  const [website, setWebsite] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    startTransition(async () => {
      try {
        await createClient({
          companyName: companyName.trim(),
          industry: industry.trim() || undefined,
          brandColor,
          website: website.trim() || undefined,
        });
        router.push("/clients");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create client.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="brutalist-border bg-error/10 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-error">{error}</p>
        </div>
      )}

      {/* Company Name */}
      <div>
        <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
          COMPANY_NAME *
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
          required
          className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20"
        />
      </div>

      {/* Industry */}
      <div>
        <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
          INDUSTRY
        </label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Technology, Real Estate, Healthcare..."
          className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20"
        />
      </div>

      {/* Brand Color */}
      <div>
        <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
          BRAND_COLOR
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setBrandColor(color)}
              className={`w-8 h-8 brutalist-border transition-all ${
                brandColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-8 h-8 cursor-pointer border-0 bg-transparent"
            />
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40">
              {brandColor}
            </span>
          </div>
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60 mb-2">
          WEBSITE
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className="w-full brutalist-border bg-transparent px-4 py-3 font-mono text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20"
        />
      </div>


      {/* Submit */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="mono-clip bg-primary-container text-white px-8 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              CREATING...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">add</span>
              CREATE_CLIENT
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="brutalist-border px-6 py-3 font-headline text-xs uppercase text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
