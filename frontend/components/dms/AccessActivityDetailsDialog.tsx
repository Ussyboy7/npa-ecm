"use client";

import { formatDistanceToNow } from 'date-fns';
import { Activity, User as UserIcon, Clock, Eye, Download as DownloadIcon, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/correspondence-helpers';
import type { DocumentAccessLog } from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';

interface AccessActivityDetailsDialogProps {
  log: DocumentAccessLog | null;
  accessLogs: DocumentAccessLog[];
  userLookup: Map<string, User>;
  onClose: () => void;
}

export function AccessActivityDetailsDialog({
  log,
  accessLogs,
  userLookup,
  onClose,
}: AccessActivityDetailsDialogProps) {
  if (!log) return null;

  const user = userLookup.get(log.userId);
  const displayUserName = user?.name ?? log.userName ?? 'Unknown User';
  const actionLabel =
    log.action === 'download'
      ? 'Downloaded'
      : log.action === 'attempted-download'
        ? 'Attempted Download'
        : 'Viewed';
  const ActionIcon = log.action === 'download' ? DownloadIcon : Eye;

  const userLogs = accessLogs.filter((entry) => entry.userId === log.userId);
  const sortedUserLogs = [...userLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const isFirstAccess = sortedUserLogs.length > 0 && sortedUserLogs[0].id === log.id;
  const relativeTime = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Access Activity Details
          </DialogTitle>
          <DialogDescription>Detailed information about this access activity</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <ActionIcon className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Action</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">{actionLabel}</p>
                  {log.action === 'attempted-download' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">User</p>
                <p className="text-sm text-muted-foreground">{displayUserName}</p>
                {user?.gradeLevel && (
                  <p className="text-xs text-muted-foreground mt-0.5">{user.gradeLevel}</p>
                )}
                {isFirstAccess && (
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    First Access
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Timestamp</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(log.timestamp)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Document Sensitivity</p>
                <Badge variant="outline" className="mt-1">
                  {log.sensitivity || 'N/A'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
