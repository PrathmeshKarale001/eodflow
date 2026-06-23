"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavbarAuthSection } from "@/components/navbar-auth-section";

/**
 * Navbar — Static server component (no auth() call).
 * Auth-dependent UI (login vs dashboard button) is handled by NavbarAuthSection
 * client component, which checks session cookies client-side.
 * This allows the root layout to avoid `force-dynamic` and enables SSG/ISR.
 */
export function Navbar() {
  return (
    <header className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 relative z-10 h-auto lg:h-16">
      {/* Mobile flex header wrapper, becomes invisible contents on desktop */}
      <div className="flex items-center justify-between brutalist-border p-3 bg-surface-container-lowest w-full lg:contents">
        {/* Brand Block */}
        <div className="lg:col-span-3 lg:brutalist-border lg:p-4 flex items-center justify-between lg:bg-surface-container-lowest flex-shrink-0">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/flowlogo.svg" alt="EOD Flow" className="h-6 lg:h-7 w-auto block" />
          </Link>
          <div className="flex items-center gap-2 ml-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="font-label text-[11px] text-on-surface/50 uppercase">LIVE_OPS</span>
          </div>
        </div>

        {/* Right Auth/Theme block on Mobile */}
        <div className="flex lg:hidden items-center gap-2 h-9">
          <ThemeToggle />
          <NavbarAuthSection className="bg-primary-container text-on-primary-container font-headline text-[11px] uppercase font-bold hover:bg-primary hover:text-on-primary transition-all px-3 h-full flex items-center justify-center mono-clip" />
        </div>
      </div>

      {/* Middle Links - Hidden on Mobile */}
      <div className="hidden lg:flex lg:col-span-6 brutalist-border p-4 items-center justify-center gap-8 bg-surface-container-lowest">
        <Link className="font-label text-xs uppercase tracking-widest text-primary border-b border-primary" href="/">Home</Link>
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="/#workflow">Workflow</Link>
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="/#roles">Roles</Link>
      </div>

      {/* Desktop Auth/Theme block */}
      <div className="hidden lg:flex lg:col-span-3 brutalist-border p-2 bg-primary-container/20 items-center gap-2">
        <ThemeToggle />
        <NavbarAuthSection />
      </div>
    </header>
  );
}
