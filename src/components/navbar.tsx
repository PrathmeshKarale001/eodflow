import Link from "next/link";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Navbar() {
  const session = await auth();

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
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="#">Workflow</Link>
        <Link className="font-label text-xs uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors" href="#">Roles</Link>
      </div>
      <div className="col-span-12 lg:col-span-3 brutalist-border p-2 bg-primary-container/20 flex items-center gap-2">
        <ThemeToggle />
        {session?.user ? (
          <Link href="/overview" className="flex-1 h-full bg-primary-container text-on-primary-container font-headline text-sm uppercase font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center mono-clip">
            DASHBOARD
          </Link>
        ) : (
          <Link href="/login" className="flex-1 h-full bg-primary-container text-on-primary-container font-headline text-sm uppercase font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center mono-clip">
            SIGN IN_SYS
          </Link>
        )}
      </div>
    </header>
  );
}
