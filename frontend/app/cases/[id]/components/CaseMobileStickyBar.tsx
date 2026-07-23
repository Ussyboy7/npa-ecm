"use client";

import { Button } from "@/components/ui/button";
import { Download, Link as LinkIcon, MessageSquare } from "lucide-react";

interface CaseMobileStickyBarProps {
  canPackage: boolean;
  packageHref?: string | null;
  onPackage: () => void;
  onLink: () => void;
  onComments: () => void;
}

export function CaseMobileStickyBar({
  canPackage,
  packageHref,
  onPackage,
  onLink,
  onComments,
}: CaseMobileStickyBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md safe-area-inset-bottom">
      <div className="flex items-center gap-2 max-w-lg mx-auto px-3 py-2.5">
        {packageHref ? (
          <Button className="flex-1 h-10 rounded-xl text-[13px] font-medium" size="sm" asChild>
            <a href={packageHref} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1.5" />
              Package
            </a>
          </Button>
        ) : (
          <Button
            className="flex-1 h-10 rounded-xl text-[13px] font-medium"
            size="sm"
            onClick={onPackage}
            disabled={!canPackage}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Package
          </Button>
        )}
        <Button
          variant="secondary"
          className="h-10 rounded-xl text-[13px] px-3"
          size="sm"
          onClick={onLink}
        >
          <LinkIcon className="h-4 w-4 mr-1.5" />
          Link
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
