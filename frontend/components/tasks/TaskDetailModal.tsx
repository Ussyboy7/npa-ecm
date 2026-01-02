"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Shield, Clock, CheckCircle2, Bell, UserPlus, ExternalLink } from 'lucide-react';
import { formatDateTime } from '@/lib/correspondence-helpers';
import Link from 'next/link';

interface TaskItem {
  id: string;
  type: 'correspondence' | 'approval' | 'minute';
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'overdue' | 'due-soon' | 'pending';
  dueDate?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
  link: string;
  metadata?: {
    referenceNumber?: string;
    fromOffice?: string;
    toOffice?: string;
  };
}

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (taskId: string) => void;
  onSnooze?: (taskId: string, hours: number) => void;
  onDelegate?: (taskId: string) => void;
}

export const TaskDetailModal = ({
  task,
  isOpen,
  onClose,
  onComplete,
  onSnooze,
  onDelegate,
}: TaskDetailModalProps) => {
  if (!task) return null;

  const getTypeIcon = () => {
    switch (task.type) {
      case 'correspondence':
        return <Mail className="h-5 w-5 text-primary" />;
      case 'approval':
        return <Shield className="h-5 w-5 text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-primary" />;
    }
  };

  const getStatusBadge = () => {
    if (task.status === 'overdue') {
      return (
        <Badge variant="destructive">
          Overdue {task.daysOverdue} day{task.daysOverdue !== 1 ? 's' : ''}
        </Badge>
      );
    }
    if (task.status === 'due-soon') {
      return (
        <Badge variant="default">
          Due in {task.daysUntilDue} day{task.daysUntilDue !== 1 ? 's' : ''}
        </Badge>
      );
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getPriorityBadge = () => {
    const variantMap = {
      urgent: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    } as const;
    return (
      <Badge variant={variantMap[task.priority]}>
        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Task Details
          </DialogTitle>
          <DialogDescription>
            View and manage task information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge()}
                {getPriorityBadge()}
                {task.metadata?.referenceNumber && (
                  <Badge variant="outline">
                    Ref: {task.metadata.referenceNumber}
                  </Badge>
                )}
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Due: {formatDateTime(task.dueDate)}
                  </span>
                </div>
              )}

              {task.metadata?.fromOffice && (
                <div className="text-sm text-muted-foreground">
                  From: {task.metadata.fromOffice}
                </div>
              )}

              {task.metadata?.toOffice && (
                <div className="text-sm text-muted-foreground">
                  To: {task.metadata.toOffice}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Quick Actions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onComplete && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onComplete(task.id);
                      onClose();
                    }}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                {onSnooze && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSnooze(task.id, 24);
                      onClose();
                    }}
                    className="w-full"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Snooze 24h
                  </Button>
                )}
                {onDelegate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onDelegate(task.id);
                      onClose();
                    }}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Delegate
                  </Button>
                )}
                <Link href={task.link} className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

