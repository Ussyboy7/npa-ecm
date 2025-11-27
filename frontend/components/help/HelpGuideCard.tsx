"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

interface HelpLink {
  label: string;
  href: string;
  external?: boolean;
}

interface HelpGuideCardProps {
  title: string;
  description: string;
  links?: HelpLink[];
  className?: string;
  dismissible?: boolean;
  dismissKey?: string; // Unique key for localStorage
}

export const HelpGuideCard = ({ 
  title, 
  description, 
  links, 
  className,
  dismissible = false,
  dismissKey,
}: HelpGuideCardProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const storageKey = dismissKey ? `help-guide-dismissed-${dismissKey}` : null;

  useEffect(() => {
    if (storageKey) {
      const dismissed = localStorage.getItem(storageKey);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-dashed border-primary/40 bg-primary/5 backdrop-blur-sm relative",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Workspace Guide</p>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {links && links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <Button
                  key={`${link.href}-${link.label}`}
                  variant="secondary"
                  size="sm"
                  asChild
                  className="gap-1"
                >
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                  >
                    {link.label}
                    {link.external && <ExternalLink className="h-3 w-3" />}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
              title="Dismiss guide"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
