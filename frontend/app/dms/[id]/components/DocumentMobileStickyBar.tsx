"use client";

import { Button } from "@/components/ui/button";
import { Download, Share2, FilePlus, MessageSquare } from "lucide-react";

interface DocumentMobileStickyBarProps {
  canDownload: boolean;
  canUpload: boolean;
  onDownload: () => void;
  onShare: () => void;
  onAddVersion: () => void;
  onComments: () => void;
}

export function DocumentMobileStickyBar({
  canDownload,
  canUpload,
  onDownload,
  onShare,
  onAddVersion,
  onComments,
}: DocumentMobileStickyBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center gap-2 max-w-lg mx-auto px-3 py-2.5">
        <Button
          className="flex-1 h-10 rounded-xl text-[13px] font-medium"
          size="sm"
          onClick={onDownload}
          disabled={!canDownload}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button
          variant="secondary"
          className="h-10 rounded-xl text-[13px] px-3"
          size="sm"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
        <Button
          variant="ghost"
          className="h-10 rounded-xl text-[13px] px-3 text-muted-foreground"
          size="sm"
          onClick={onAddVersion}
          disabled={!canUpload}
        >
          <FilePlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-10 rounded-xl text-[13px] px-3 text-muted-foreground"
          size="sm"
          onClick={onComments}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
