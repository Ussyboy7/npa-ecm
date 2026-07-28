"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import { apiFetch } from '@/lib/api-client';
import { logError } from '@/lib/client-logger';
import type { DistributionRecipient } from '@/lib/npa-structure';

interface ShareWithDepartmentButtonProps {
  distribution: DistributionRecipient;
  correspondenceId: string;
  onShared: () => void;
}

export const ShareWithDepartmentButton = ({
  distribution,
  correspondenceId,
  onShared,
}: ShareWithDepartmentButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!distribution.departmentId) {
      toast.error('Department ID is required');
      return;
    }

    setIsSharing(true);
    try {
      await apiFetch(`/correspondence/distribution/share-with-department/`, {
        method: 'POST',
        body: JSON.stringify({
          correspondence_id: correspondenceId,
          department_id: distribution.departmentId,
          parent_distribution_id: distribution.id,
        }),
      });

      toast.success('Shared with department members successfully');
      onShared();
    } catch (error: unknown) {
      logError('Failed to share with department', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'detail' in error &&
              typeof (error as { detail?: unknown }).detail === 'string'
            ? (error as { detail: string }).detail
            : 'Failed to share with department';
      toast.error(errorMessage);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={isSharing}
      className="h-6 px-2 text-xs"
    >
      {isSharing ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Sharing...
        </>
      ) : (
        <>
          <Users className="h-3 w-3 mr-1" />
          Share with Department
        </>
      )}
    </Button>
  );
};

