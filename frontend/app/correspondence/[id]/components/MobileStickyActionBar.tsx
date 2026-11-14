"use client";

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  CheckCircle,
  User as UserIcon,
  Info,
  Eye,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';

interface MobileStickyActionBarProps {
  isForInformationOnly: boolean;
  distributionPurpose?: 'action' | 'information' | null;
  /** Primary routing label, matching the desktop action panel. */
  primaryLabel: string;
  /** Whether the desktop panel offers a treatment/response action. */
  showTreat: boolean;
  treatLabel: string;
  /** Matches desktop: only after every minute is acknowledged. */
  canComplete: boolean;
  /** Complete the last routed turn when no response is expected. */
  canCompleteNoResponse: boolean;
  /** Matches desktop: hidden while a delegation is active. */
  canDelegate: boolean;
  markedAsRead?: boolean;
  onMinute: () => void;
  onTreat: () => void;
  onComplete: () => void;
  onCompleteNoResponse: () => void;
  onDelegate: () => void;
  onMarkRead?: () => void;
}

export function MobileStickyActionBar({
  isForInformationOnly,
  distributionPurpose,
  primaryLabel,
  showTreat,
  treatLabel,
  canComplete,
  canCompleteNoResponse,
  canDelegate,
  markedAsRead = false,
  onMinute,
  onTreat,
  onComplete,
  onCompleteNoResponse,
  onDelegate,
  onMarkRead,
}: MobileStickyActionBarProps) {
  const isCCInfo = distributionPurpose === 'information';
  const isCCAction = distributionPurpose === 'action';
  const isCCRecipient = isCCInfo || isCCAction;
  const hasMoreActions = canComplete || canCompleteNoResponse || canDelegate;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center gap-2 max-w-lg mx-auto px-3 py-2.5">
        {isForInformationOnly && !isCCRecipient ? (
          <div className="flex-1 px-3 py-2 rounded-xl bg-muted/40 text-center">
            <span className="text-[12px] text-muted-foreground inline-flex items-center justify-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              For information only
            </span>
          </div>
        ) : isCCInfo ? (
          <>
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onMinute}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              {primaryLabel}
            </Button>
            <Button
              variant={markedAsRead ? 'ghost' : 'secondary'}
              className="h-10 rounded-xl text-[13px]"
              size="sm"
              onClick={onMarkRead}
              disabled={markedAsRead}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {markedAsRead ? 'Read' : 'Mark as Read'}
            </Button>
          </>
        ) : isCCAction ? (
          <>
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onMinute}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              {primaryLabel}
            </Button>
            {showTreat && (
              <Button variant="secondary" className="h-10 rounded-xl text-[13px]" size="sm" onClick={onTreat}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                {treatLabel}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onMinute}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              {primaryLabel}
            </Button>
            {showTreat && (
              <Button variant="secondary" className="h-10 rounded-xl text-[13px] px-3" size="sm" onClick={onTreat}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                {treatLabel}
              </Button>
            )}
            {hasMoreActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 rounded-xl px-0 text-muted-foreground"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  {canComplete && (
                    <DropdownMenuItem className="text-[13px]" onClick={onComplete}>
                      <CheckCircle className="h-4 w-4 mr-2 opacity-70" />
                      Complete correspondence
                    </DropdownMenuItem>
                  )}
                  {canCompleteNoResponse && (
                    <DropdownMenuItem className="text-[13px]" onClick={onCompleteNoResponse}>
                      <CheckCircle className="h-4 w-4 mr-2 opacity-70" />
                      Finish — no reply required
                    </DropdownMenuItem>
                  )}
                  {(canComplete || canCompleteNoResponse) && canDelegate && <DropdownMenuSeparator />}
                  {canDelegate && (
                    <DropdownMenuItem className="text-[13px]" onClick={onDelegate}>
                      <UserIcon className="h-4 w-4 mr-2 opacity-70" />
                      Delegate to TA/PA
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>
    </div>
  );
}
