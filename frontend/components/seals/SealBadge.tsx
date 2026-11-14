"use client";

import { Shield, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DigitalSealPreview } from "@/components/seals/DigitalSealPreview";
import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from '@/lib/datetime';

export interface SealData {
  id: string;
  serialNumber: string;
  verificationUrl: string;
  sealedBy: string;
  officeName: string;
  officeTitle: string;
  sealedAt: string;
  isValid: boolean;
  sealImageUrl?: string;
  signatureImageUrl?: string;
}

interface SealBadgeProps {
  sealData: SealData;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function SealBadge({ sealData, size = "sm", showDetails = false }: SealBadgeProps) {
  const [open, setOpen] = useState(false);

  const getVerificationUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify/${sealData.serialNumber}`;
    }
    return sealData.verificationUrl;
  };

  const verificationUrl = getVerificationUrl();

  const formatDate = (dateString: string) =>
    formatDateTime(dateString, 'en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const sizeClasses = {
    sm: "text-[10px] h-5 px-1.5",
    md: "text-xs h-6 px-2",
    lg: "text-sm h-7 px-3",
  };

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
            <Badge
              variant={sealData.isValid ? "default" : "destructive"}
              className={`${sizeClasses[size]} gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700`}
            >
              <Shield className="h-3 w-3" />
              Sealed
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Digital Executive Seal</p>
              <p className="text-muted-foreground">Serial: {sealData.serialNumber}</p>
              <p className="text-muted-foreground">By: {sealData.sealedBy}</p>
              <p className="text-muted-foreground">{formatDate(sealData.sealedAt)}</p>
            </div>
          </TooltipContent>
        </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge
          variant={sealData.isValid ? "default" : "destructive"}
          className={`${sizeClasses[size]} gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700`}
        >
          <Shield className="h-3 w-3" />
          Sealed
        </Badge>
      </DialogTrigger>
      <DialogContent size="md" height="fill">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Digital Executive Seal
          </DialogTitle>
        </DialogHeader>
          <DialogDescription>Verify this executive's digital seal.</DialogDescription>
        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          {/* Seal Preview - Centered */}
          <div className="flex justify-center p-3 doc-paper rounded-lg border border-emerald-200 dark:border-emerald-800">
            {sealData.sealImageUrl ? (
              <img
                src={sealData.sealImageUrl}
                alt={`Digital seal ${sealData.serialNumber}`}
                width={240}
                height={240}
                className="h-[240px] w-[240px] object-contain"
              />
            ) : (
              <DigitalSealPreview
                officeName={sealData.officeName}
                officeTitle={sealData.officeTitle}
                serialNumber={sealData.serialNumber}
                signatureText={sealData.sealedBy}
                timestamp={sealData.sealedAt}
                size={240}
                showQR={true}
                verificationBaseUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
              />
            )}
          </div>
          
          {/* Seal Info - Grid Layout */}
          <div className="grid grid-cols-1 gap-3">
            {/* Left Column - Seal Details */}
            <div className="space-y-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Serial Number</p>
                <p className="font-mono font-bold text-sm text-foreground">{sealData.serialNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Date & Time</p>
                <p className="text-sm text-foreground">{formatDate(sealData.sealedAt)}</p>
              </div>
            </div>
            
          </div>

          {/* Status Badge and Actions - Centered */}
          <div className="flex items-center justify-center gap-3 pt-3 border-t">
            <Badge variant={sealData.isValid ? "default" : "destructive"} className="bg-emerald-600">
              {sealData.isValid ? "✓ Valid" : "✗ Invalid"}
            </Badge>
            
            <Link href={verificationUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                aria-label={`Open verification page for seal ${sealData.serialNumber} in new tab`}
              >
                <ExternalLink className="h-4 w-4" />
                View Full Verification
              </Button>
            </Link>
          </div>

          {/* Organization Footer */}
          <div className="text-center text-xs text-muted-foreground pt-3 border-t pb-2">
            <p className="font-semibold text-foreground mb-1">{sealData.officeName}</p>
            <p>This seal certifies that this document has been digitally approved.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
