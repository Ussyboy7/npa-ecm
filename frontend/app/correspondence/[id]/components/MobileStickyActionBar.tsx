"use client";

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  CheckCircle,
  ChevronRight,
  Archive,
  User as UserIcon,
  Info,
} from 'lucide-react';

interface MobileStickyActionBarProps {
  isForInformationOnly: boolean;
  onMinute: () => void;
  onTreat: () => void;
  onComplete: () => void;
  onDelegate: () => void;
}

export function MobileStickyActionBar({
  isForInformationOnly,
  onMinute,
  onTreat,
  onComplete,
  onDelegate,
}: MobileStickyActionBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 z-40 safe-area-inset-bottom">
      <div className="flex gap-2 max-w-lg mx-auto">
        {isForInformationOnly ? (
          <div className="flex-1 p-2 bg-muted/50 border border-border rounded-lg text-center">
            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Info className="h-3.5 w-3.5" />
              For Information Only
            </span>
          </div>
        ) : (
          <>
            <Button className="flex-1 bg-gradient-primary hover:opacity-90" size="sm" onClick={onMinute}>
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Minute
            </Button>
            <Button variant="secondary" size="sm" onClick={onTreat}>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Treat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onComplete}>
                  <Archive className="h-4 w-4 mr-2" />
                  Complete & Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelegate}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Delegate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
