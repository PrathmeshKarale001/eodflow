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
    <header className="data-grid gap-4 h-auto lg:h-16 relative z-10">
      <div className="col-span-12 lg:col-span-3 brutalist-border p-4 flex items-center justify-between bg-surface-container-lowest">
        <Link href="/" className="font-headline font-extrabold text-2xl tracking-tighter uppercase hover:text-primary transition-colors">
          EOD FLOW
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-label text-[10px] text-on-surface/50 uppercase">LIVE_OPS</span>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-6 brutalist-border p-4 flex items-center justify-center gap-8 bg-surface-container-lowest">
        <Link className="font-label text-xs uppercase tracking-widest text-primary border-b border-primary" href="/">Home</Link>
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="/#workflow">Workflow</Link>
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="/#roles">Roles</Link>
      </div>
      <div className="col-span-12 lg:col-span-3 brutalist-border p-2 bg-primary-container/20 flex items-center gap-2">
        <ThemeToggle />
        <NavbarAuthSection />
      </div>
    </header>
  );
}
