import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const DocumentCardSkeleton = () => {
  return (
    <Card className="p-4 border border-border rounded-lg">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </Card>
  );
};

