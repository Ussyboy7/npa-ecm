import { Skeleton } from '@/components/ui/skeleton';

function SidebarSkeleton() {
  return (
    <div className="w-64 h-full border-r border-sidebar-border bg-sidebar p-3 flex flex-col gap-1 shrink-0">
      <div className="flex items-center gap-2 px-2 py-3">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2 flex-1">
        <MenuGroupSkeleton count={5} />
        <MenuGroupSkeleton count={3} />
        <MenuGroupSkeleton count={3} />
        <MenuGroupSkeleton count={3} />
        <MenuGroupSkeleton count={2} />
        <MenuGroupSkeleton count={3} />
        <MenuGroupSkeleton count={2} />
      </div>
    </div>
  );
}

function MenuGroupSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Skeleton className="h-4 w-24 ml-2 mb-1" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className="h-3.5 rounded" style={{ width: `${50 + (i * 13) % 40}%` }} />
        </div>
      ))}
    </div>
  );
}

function TopBarSkeleton() {
  return (
    <div className="h-12 border-b border-border bg-sidebar flex items-center px-4 gap-3 shrink-0">
      <Skeleton className="h-4 w-24 hidden md:block" />
      <Skeleton className="h-4 w-32 hidden md:block" />
      <div className="flex-1" />
      <Skeleton className="h-4 w-28 hidden lg:block" />
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    </div>
  );
}

function ContentAreaSkeleton() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShellSkeleton() {
  return (
    <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
      <SidebarSkeleton />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopBarSkeleton />
        <main className="flex-1 min-h-0 min-w-0 overflow-auto overscroll-contain flex flex-col">
          <ContentAreaSkeleton />
        </main>
      </div>
    </div>
  );
}
