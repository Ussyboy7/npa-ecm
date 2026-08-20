"use client";

import { Button } from "@/components/ui/button";
import { Download, Link as LinkIcon, MessageSquare } from "lucide-react";

interface CaseMobileStickyBarProps {
  canPackage: boolean;
  canDownloadPackage?: boolean;
  onDownloadPackage?: () => void;
  onPackage: () => void;
  onLink: () => void;
  onComments: () => void;
}

export function CaseMobileStickyBar({
  canPackage,
  canDownloadPackage = false,
  onDownloadPackage,
  onPackage,
  onLink,
  onComments,
}: CaseMobileStickyBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center gap-2 max-w-lg mx-auto px-3 py-2.5">
        {canDownloadPackage && onDownloadPackage ? (
          <Button
            className="flex-1 h-10 rounded-xl text-[13px] font-medium"
            size="sm"
            onClick={onDownloadPackage}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Package
          </Button>
        ) : canPackage ? (
          <Button
            className="flex-1 h-10 rounded-xl text-[13px] font-medium"
            size="sm"
            onClick={onPackage}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Package
          </Button>
        ) : null}
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-[13px]" size="sm" onClick={onLink}>
          <LinkIcon className="h-4 w-4 mr-1.5" />
          Link
        </Button>
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-[13px]" size="sm" onClick={onComments}>
          <MessageSquare className="h-4 w-4 mr-1.5" />
          Comments
        </Button>
      </div>
    </div>
  );
}
