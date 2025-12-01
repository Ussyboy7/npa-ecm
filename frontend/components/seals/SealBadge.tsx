"use client";

import { Shield, ExternalLink, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

interface SealData {
  id: string;
  serialNumber: string;
  verificationUrl: string;
  sealedBy: string;
  officeName: string;
  officeTitle: string;
  sealedAt: string;
  isValid: boolean;
}

interface SealBadgeProps {
  sealData: SealData;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function SealBadge({ sealData, size = "sm", showDetails = false }: SealBadgeProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const sizeClasses = {
    sm: "text-[10px] h-5 px-1.5",
    md: "text-xs h-6 px-2",
    lg: "text-sm h-7 px-3",
  };

  if (!showDetails) {
    return (
      <TooltipProvider>
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
      </TooltipProvider>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge
          variant={sealData.isValid ? "default" : "destructive"}
          className={`${sizeClasses[size]} gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700`}
        >
          <Shield className="h-3 w-3" />
          Sealed
        </Badge>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Digital Executive Seal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Seal Info */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="font-mono font-bold text-sm">{sealData.serialNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sealed By</p>
                  <p className="font-medium text-sm">{sealData.sealedBy}</p>
                  <p className="text-xs text-muted-foreground">{sealData.officeTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="text-sm">{formatDate(sealData.sealedAt)}</p>
                </div>
              </div>
              
              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white rounded-lg border">
                  <QRCodeSVG
                    value={sealData.verificationUrl}
                    size={80}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Scan to verify</p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant={sealData.isValid ? "default" : "destructive"} className="bg-emerald-600">
              {sealData.isValid ? "✓ Valid" : "✗ Invalid"}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => window.open(sealData.verificationUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Verify Online
            </Button>
          </div>

          {/* Organization */}
          <div className="text-center text-xs text-muted-foreground border-t pt-3">
            <p className="font-semibold">{sealData.officeName}</p>
            <p>This seal certifies that this document has been digitally approved.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

