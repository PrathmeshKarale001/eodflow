"use client";

import { useState } from "react";
import Link from "next/link";

interface ClientCard {
  id: string;
  companyName: string;
  industry: string | null;
  brandColor: string;
  pocAdminName: string | null;
  activeProjects: number;
  totalProjects: number;
  fileCount: number;
}

interface ClientsGridProps {
  clients: ClientCard[];
}

export function ClientsGridClient({ clients }: ClientsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = clients.filter((c) =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Search Bar */}
      <div className="brutalist-border bg-surface-container-lowest flex items-center gap-2 px-4 py-2.5">
        <span className="material-symbols-outlined text-sm text-on-surface/30">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="flex-1 bg-transparent text-sm font-body text-foreground placeholder:text-on-surface/30 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-on-surface/30 hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
        <span className="font-mono text-[11px] text-on-surface/30 uppercase">
          {filtered.length}/{clients.length}
        </span>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="brutalist-border bg-surface-container-lowest p-5 hover:bg-surface-container-low transition-colors group block"
          >
            {/* Brand Color Bar */}
            <div
              className="h-1 w-full mb-4"
              style={{ backgroundColor: client.brandColor || "#6c5ce7" }}
            />

            {/* Client Name */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-headline text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {client.companyName}
                </h3>
                {client.industry && (
                  <p className="font-label text-[11px] text-outline uppercase tracking-widest mt-0.5">
                    {client.industry}
                  </p>
                )}
              </div>
              <div
                className="w-3 h-3 flex-shrink-0 mt-1"
                style={{ backgroundColor: client.brandColor || "#6c5ce7" }}
                title={client.brandColor || ""}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="brutalist-border p-2 text-center">
                <span className="font-headline text-lg font-bold text-foreground block">{client.activeProjects}</span>
                <span className="font-label text-[10px] text-outline uppercase tracking-widest">ACTIVE</span>
              </div>
              <div className="brutalist-border p-2 text-center">
                <span className="font-headline text-lg font-bold text-foreground block">{client.totalProjects}</span>
                <span className="font-label text-[10px] text-outline uppercase tracking-widest">TOTAL</span>
              </div>
              <div className="brutalist-border p-2 text-center">
                <span className="font-headline text-lg font-bold text-foreground block">{client.fileCount}</span>
                <span className="font-label text-[10px] text-outline uppercase tracking-widest">FILES</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-on-surface/10 pt-3">
              <span className="font-label text-[11px] text-outline uppercase tracking-widest">
                POC: {client.pocAdminName ?? "UNASSIGNED"}
              </span>
              <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="brutalist-border p-12 text-center">
          <span className="material-symbols-outlined text-3xl text-outline mb-3 block">domain_disabled</span>
          <p className="font-label text-[10px] text-outline uppercase tracking-widest">
            {searchQuery ? "NO_MATCHING_CLIENTS" : "NO_CLIENTS_FOUND"}
          </p>
        </div>
      )}
    </>
  );
}
