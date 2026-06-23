"use client";

import { useState } from "react";
import { reviewDeptRequest, changeUserDepartment } from "@/app/actions/users";
import type { Department } from "@prisma/client";

interface DeptRequest {
  id: string;
  currentDept: Department | null;
  requestedDept: Department;
  createdAt: Date;
  user: { id: string; name: string; email: string; department: Department | null };
}

export function DeptChangeRequestsPanel({ initialRequests }: { initialRequests: DeptRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleReview = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setProcessing(requestId);
    try {
      await reviewDeptRequest(requestId, action);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="brutalist-border bg-card p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-lg text-amber-400">swap_horiz</span>
        <h2 className="font-headline text-sm uppercase tracking-widest text-card-text">
          DEPARTMENT_CHANGE_REQUESTS
        </h2>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[11px] uppercase">
          {requests.length} PENDING
        </span>
      </div>

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 brutalist-border bg-surface-container-lowest"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary-container/30 text-xs font-headline font-bold text-primary uppercase">
                {req.user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-label text-xs uppercase tracking-wide text-foreground truncate">
                  {req.user.name}
                </p>
                <p className="font-mono text-[10px] text-on-surface/40 truncate">
                  {req.currentDept ?? "NONE"} → <span className="text-primary">{req.requestedDept}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleReview(req.id, "APPROVED")}
                disabled={processing === req.id}
                className="flex h-7 items-center gap-1 px-3 brutalist-border bg-green-900/30 text-green-300 text-[11px] font-label uppercase tracking-wider hover:bg-green-900/50 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">check</span>
                APPROVE
              </button>
              <button
                onClick={() => handleReview(req.id, "REJECTED")}
                disabled={processing === req.id}
                className="flex h-7 items-center gap-1 px-3 brutalist-border bg-red-900/30 text-red-300 text-[11px] font-label uppercase tracking-wider hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">close</span>
                REJECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
