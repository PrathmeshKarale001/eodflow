interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  accent: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, accent, subtitle }: StatCardProps) {
  return (
    <div className={`brutalist-border bg-card p-5 relative overflow-hidden border-t-4 ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface/50 mb-1">{label}</p>
          <p className="font-mono text-4xl tracking-tight text-card-text leading-none">{value}</p>
          {subtitle ? (
            <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/50 mt-2">{subtitle}</p>
          ) : null}
        </div>
        <span className="material-symbols-outlined text-2xl text-on-surface/30">{icon}</span>
      </div>
    </div>
  );
}
