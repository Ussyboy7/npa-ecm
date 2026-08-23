import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationLoading() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>

        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${80 + i * 20}px` }} />
          ))}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-8 rounded-full ml-auto" />
              </div>
              <div className="ml-7 space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-3.5 shrink-0" />
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-5 w-8 rounded-full ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
