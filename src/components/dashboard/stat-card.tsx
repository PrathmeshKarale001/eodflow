interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, accent, subtitle }: StatCardProps) {
  return (
    <div className={`brutalist-border bg-white p-5 relative overflow-hidden border-t-4 ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
          <p className="font-mono text-4xl tracking-tight text-[#180065] leading-none">{value}</p>
          {subtitle ? (
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-2">{subtitle}</p>
          ) : null}
        </div>
        <span className="material-symbols-outlined text-2xl text-neutral-300">{icon}</span>
      </div>
    </div>
  );
}
