"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare,
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Link,
  Share2,
  Archive,
  Users,
  User,
  Briefcase,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/correspondence-helpers";
import type { Correspondence, Minute } from "@/lib/npa-structure";

interface ActionsPanelProps {
  correspondence?: Correspondence;
  minutes?: Minute[];
  activeUser?: any;
  onOpenParallelRouteModal?: () => void;
  onOpenLinkCaseModal?: () => void;
  isCompleted?: boolean;
  isCurrentUserTurn?: boolean;
  isForInformationOnly?: boolean;
  isExecutive?: boolean;
  turnRestrictedDisabled?: boolean;
  completionPackageUrl?: string | null;
  completionGeneratedAt?: string | null;
  activeDelegation?: any;
  organizationUsers?: any[];
  offices?: any[];
  officeMemberships?: any[];
  lookupUser?: (id: string) => any;
  onOpenMinuteModal?: () => void;
  onOpenTreatmentModal?: () => void;
  onOpenCompletionModal?: () => void;
  onOpenDelegateModal?: () => void;
  onDownloadCompletionPackage?: (url: string, filename: string) => Promise<void>;
  onSyncFromApi?: () => Promise<any>;
  [key: string]: any;
}

export function ActionsPanel({
  correspondence,
  minutes = [],
  activeUser,
  isCompleted = false,
  isCurrentUserTurn = false,
  isForInformationOnly = false,
  isExecutive = false,
  turnRestrictedDisabled = false,
  completionPackageUrl,
  completionGeneratedAt,
  activeDelegation,
  onOpenMinuteModal,
  onOpenTreatmentModal,
  onOpenCompletionModal,
  onOpenDelegateModal,
  onDownloadCompletionPackage,
  onSyncFromApi,
}: ActionsPanelProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncFromApi) return;
    setSyncing(true);
    try {
      await onSyncFromApi();
    } finally {
      setSyncing(false);
    }
  };

  if (!correspondence) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading actions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : isCurrentUserTurn ? (
              <Clock className="h-4 w-4 text-blue-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Status:</span>
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                isCompleted && "bg-green-100 text-green-800",
                isCurrentUserTurn && !isCompleted && "bg-blue-100 text-blue-800"
              )}
            >
              {isCompleted ? "Completed" : isCurrentUserTurn ? "Your Turn" : "Waiting"}
            </Badge>
          </div>

          {activeDelegation && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Delegated to:</span>
              <Badge variant="outline">{activeDelegation.delegateeName}</Badge>
            </div>
          )}

          {isForInformationOnly && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Purpose:</span>
              <Badge variant="outline">For Information</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Actions */}
      {!isCompleted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isCurrentUserTurn && !turnRestrictedDisabled && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onOpenMinuteModal}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Minute
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add a new minute to this correspondence</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onOpenTreatmentModal}
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Process Correspondence
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Take action on this correspondence</TooltipContent>
                </Tooltip>

                {isExecutive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onOpenCompletionModal}
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Correspondence
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark this correspondence as completed</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            {!isForInformationOnly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenDelegateModal}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Delegate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delegate this correspondence to another user</TooltipContent>
              </Tooltip>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Package */}
      {isCompleted && (completionPackageUrl || completionGeneratedAt) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Completion Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completionGeneratedAt && (
              <div className="text-xs text-muted-foreground">
                Generated: {formatDateTime(completionGeneratedAt)}
              </div>
            )}
            {completionPackageUrl && onDownloadCompletionPackage && (
              <Button
                onClick={() => onDownloadCompletionPackage(completionPackageUrl, `completion-${correspondence?.referenceNumber || 'package'}.pdf`)}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Package
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Utilities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Utilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="ghost"
                className="w-full justify-start"
                size="sm"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync from API"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data from the server</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Minutes:</span>
            <Badge variant="outline">{minutes.length}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Last Activity:</span>
            <span className="text-muted-foreground">
              {minutes.length > 0
                ? formatDateTime(minutes[minutes.length - 1].timestamp)
                : "None"
              }
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}