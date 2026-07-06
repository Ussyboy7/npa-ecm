import { LoadingState } from '@/components/shared/LoadingState';

export default function DocumentDetailLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <LoadingState message="Loading document…" />
    </div>
  );
}
