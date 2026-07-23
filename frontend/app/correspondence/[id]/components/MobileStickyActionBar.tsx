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
  Archive,
  User as UserIcon,
  Info,
  Send,
  Eye,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';

interface MobileStickyActionBarProps {
  isForInformationOnly: boolean;
  distributionPurpose?: 'action' | 'information' | null;
  onMinute: () => void;
  onTreat: () => void;
  onComplete: () => void;
  onDelegate: () => void;
  onForward?: () => void;
  onMarkRead?: () => void;
}

export function MobileStickyActionBar({
  isForInformationOnly,
  distributionPurpose,
  onMinute,
  onTreat,
  onComplete,
  onDelegate,
  onForward,
  onMarkRead,
}: MobileStickyActionBarProps) {
  const isCCInfo = distributionPurpose === 'information';
  const isCCAction = distributionPurpose === 'action';
  const isCCRecipient = isCCInfo || isCCAction;

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
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onForward}>
              <Send className="h-4 w-4 mr-1.5" />
              Forward
            </Button>
            <Button variant="ghost" className="h-10 rounded-xl text-[13px]" size="sm" onClick={onMarkRead}>
              <Eye className="h-4 w-4 mr-1.5" />
              Read
            </Button>
          </>
        ) : isCCAction ? (
          <>
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onForward}>
              <Send className="h-4 w-4 mr-1.5" />
              Forward
            </Button>
            <Button variant="secondary" className="h-10 rounded-xl text-[13px]" size="sm" onClick={onTreat}>
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Treat
            </Button>
          </>
        ) : (
          <>
            <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" onClick={onMinute}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Minute
            </Button>
            <Button variant="secondary" className="h-10 rounded-xl text-[13px] px-3" size="sm" onClick={onTreat}>
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Treat
            </Button>
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
                <DropdownMenuItem className="text-[13px]" onClick={onTreat}>
                  <ArrowRight className="h-4 w-4 mr-2 opacity-70" />
                  Treat & Respond
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-[13px]" onClick={onComplete}>
                  <Archive className="h-4 w-4 mr-2 opacity-70" />
                  Complete & Archive
                </DropdownMenuItem>
                <DropdownMenuItem className="text-[13px]" onClick={onDelegate}>
                  <UserIcon className="h-4 w-4 mr-2 opacity-70" />
                  Delegate to TA/PA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
