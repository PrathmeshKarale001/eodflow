import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
  return (
    <div className="brutalist-border bg-surface-container-lowest p-6 relative overflow-hidden h-32 flex flex-col justify-center">
      <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
      <div className="space-y-2 relative z-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 brutalist-border" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 brutalist-border" />
          <Skeleton className="h-96 brutalist-border" />
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <Skeleton className="h-80 brutalist-border" />
          <Skeleton className="h-64 brutalist-border" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="brutalist-border bg-surface-container-lowest divide-y divide-outline-variant">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-12rem)] brutalist-border overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-outline-variant bg-surface-container-low hidden md:flex flex-col">
        <div className="p-4 border-b border-outline-variant">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-surface-container-lowest">
        <div className="h-14 border-b border-outline-variant flex items-center px-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className={`flex gap-3 max-w-[70%] ${i % 2 === 0 ? "flex-row" : "flex-row-reverse"}`}>
                <Skeleton className="h-8 w-8 shrink-0" />
                <div className="space-y-2">
                  <Skeleton className={`h-4 ${i % 2 === 0 ? "w-48" : "w-64"}`} />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-outline-variant">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />
      
      {/* 3 tabs skeleton */}
      <div className="flex border brutalist-border p-1 bg-surface-container-low gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 brutalist-border" />
        ))}
      </div>

      {/* Two sections: Charts / Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 brutalist-border" />
        <Skeleton className="h-96 brutalist-border" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 brutalist-border" />
        ))}
      </div>

      {/* Calendar Grid Skeleton (7 cols x 5 rows) */}
      <div className="brutalist-border bg-card p-4 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Days of week */}
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
          {/* Days grid */}
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full brutalist-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left widget */}
        <div className="space-y-4">
          <Skeleton className="h-32 brutalist-border" />
          <Skeleton className="h-64 brutalist-border" />
        </div>
        {/* Right list */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] brutalist-border" />
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <DashboardHeaderSkeleton />
      <Skeleton className="h-[300px] brutalist-border" />
      <Skeleton className="h-[250px] brutalist-border" />
    </div>
  );
}

