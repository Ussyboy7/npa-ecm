import { LoadingState } from '@/components/shared/LoadingState';

export default function CorrespondenceDetailLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 animate-in fade-in duration-300">
      <LoadingState message="Loading correspondence…" />
    </div>
  );
}
