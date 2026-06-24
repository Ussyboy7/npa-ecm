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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-2 py-2">
      <div className="flex gap-1.5">
        <Button
          variant="default"
          size="sm"
          className="flex-1 text-[11px] px-2"
          onClick={onDownload}
          disabled={!canDownload}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Download
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[11px] px-2" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5 mr-1" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px] px-2"
          onClick={onAddVersion}
          disabled={!canUpload}
        >
          <FilePlus className="h-3.5 w-3.5 mr-1" />
          Version
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[11px] px-2" onClick={onComments}>
          <MessageSquare className="h-3.5 w-3.5 mr-1" />
          Comments
        </Button>
      </div>
    </div>
  );
}
