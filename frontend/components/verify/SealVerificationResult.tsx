"use client";

import { useState, useRef } from "react";
import { logError, logWarn, logInfo } from '@/lib/client-logger';
import { CheckCircle2, XCircle, Shield, Calendar, User, FileText, AlertTriangle, ExternalLink, Eye, Copy, Share2, Printer, Download } from "lucide-react";
import { DigitalSealPreview } from "@/components/seals/DigitalSealPreview";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSealDate, formatSealDateLong } from "@/lib/date-formatters";
import { toast } from "sonner";
import type { SealVerification } from "@/lib/api/seal-verification";

interface SealVerificationResultProps {
  verification: SealVerification;
  serial: string;
  onRetry?: () => void;
  onVerifyAnother?: () => void;
}

export function SealVerificationResult({ 
  verification, 
  serial,
  onRetry,
  onVerifyAnother 
}: SealVerificationResultProps) {
  const [copied, setCopied] = useState(false);
  const sealPreviewRef = useRef<{ getCanvas: () => HTMLCanvasElement | null; download: (filename?: string) => void }>(null);

  const handleCopySerial = () => {
    navigator.clipboard.writeText(verification.serial_number || serial);
    setCopied(true);
    toast.success('Serial number copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/verify/${verification.serial_number || serial}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Seal Verification: ${verification.valid ? 'Valid' : 'Invalid'}`,
          text: `Verify seal ${verification.serial_number || serial}`,
          url,
        });
        toast.success('Shared successfully');
      } catch (err) {
        // User cancelled or error
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopyLink(url);
        }
      }
    } else {
      handleCopyLink(url);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCertificate = () => {
    if (sealPreviewRef.current) {
      try {
        const filename = `seal-verification-certificate-${verification.serial_number}-${new Date().toISOString().split('T')[0]}.png`;
        sealPreviewRef.current.download(filename);
        toast.success('Certificate downloaded successfully');
      } catch (error) {
        logError('Failed to download certificate:', error);
        toast.error('Failed to download certificate. Please try again.');
      }
    } else {
      toast.error('Seal preview not available. Please refresh the page.');
    }
  };

  if (verification.valid) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Valid Seal</h2>
                <p className="text-emerald-100">This document has been digitally approved</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-white hover:bg-white/20"
                aria-label="Share verification"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="text-white hover:bg-white/20"
                aria-label="Print verification"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Digital Seal Preview */}
          <div className="flex justify-center py-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-lg border border-slate-700">
            <DigitalSealPreview
              ref={sealPreviewRef}
              officeName={verification.office_name}
              officeTitle={verification.office_title}
              serialNumber={verification.serial_number}
              signatureImage={verification.signature_image_url || verification.seal_image_url}
              timestamp={verification.sealed_at}
              size={220}
              showQR={true}
              verificationBaseUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
            />
          </div>

          {/* Serial Number - Enhanced */}
          <div className="text-center py-5 bg-gradient-to-r from-emerald-950/30 to-emerald-900/20 rounded-lg border border-emerald-800/30">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold">Serial Number</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-2xl font-mono font-bold text-white tracking-wider">{verification.serial_number}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySerial}
                className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300"
                aria-label="Copy serial number"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/50">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </div>

          {/* Details - Enhanced Grid Layout */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Sealed By</p>
                  <p className="text-white font-semibold text-sm">{verification.sealed_by}</p>
                  <p className="text-xs text-slate-400 mt-1">{verification.office_title}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Organization</p>
                  <p className="text-white font-semibold text-sm">{verification.office_name}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Date & Time</p>
                  <p className="text-white font-semibold text-sm">{formatSealDate(verification.sealed_at)}</p>
                </div>
              </div>
            </div>

            {(verification.document_title || verification.correspondence_subject) && (
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1">Document</p>
                    <p className="text-white font-semibold text-sm break-words mb-2">
                      {verification.document_title || verification.correspondence_subject}
                    </p>
                    <div className="flex gap-2">
                      {verification.document_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                          onClick={() => window.open(`/dms/${verification.document_id}`, '_blank')}
                          aria-label="View document"
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          View Document
                        </Button>
                      )}
                      {verification.correspondence_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                          onClick={() => window.open(`/correspondence/${verification.correspondence_id}`, '_blank')}
                          aria-label="View correspondence"
                        >
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          View Correspondence
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Enhanced */}
          <div className="pt-6 border-t border-slate-700">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 rounded-full border border-emerald-800/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">Verified & Authentic</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400">
                  Verified on {formatSealDateLong(new Date().toISOString())}
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  The authenticity of this document is confirmed by the Nigerian Ports Authority 
                  Electronic Correspondence Management system.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCertificate}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificate
                </Button>
                {onVerifyAnother && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onVerifyAnother}
                    className="border-slate-600 hover:bg-slate-700"
                  >
                    Verify Another
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Invalid seal
  return (
    <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
      {/* Error Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
              <XCircle className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {verification.invalidated_at ? "Invalidated Seal" : "Invalid Seal"}
              </h2>
              <p className="text-red-100">
                {verification.error || "This seal could not be verified"}
              </p>
            </div>
          </div>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="text-white hover:bg-white/20"
              aria-label="Retry verification"
            >
              Retry
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Serial Number - Enhanced */}
        <div className="text-center py-5 bg-gradient-to-r from-red-950/30 to-red-900/20 rounded-lg border border-red-800/30">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">Serial Number</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{serial}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopySerial}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
              aria-label="Copy serial number"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-600/50">
              <XCircle className="h-3 w-3 mr-1" />
              Invalid
            </Badge>
          </div>
        </div>

        {verification.invalidated_at && (
          <div className="p-4 bg-red-950/50 rounded-lg border border-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">This seal was invalidated</p>
                <p className="text-xs text-red-300 mt-1">
                  Date: {formatSealDate(verification.invalidated_at)}
                </p>
                {verification.invalidated_reason && (
                  <p className="text-xs text-red-300 mt-1">
                    Reason: {verification.invalidated_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="p-4 bg-amber-950/50 rounded-lg border border-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">Warning</p>
              <p className="text-xs text-amber-200 mt-1">
                This document may be fraudulent or the seal may have been tampered with. 
                Please contact the Nigerian Ports Authority to verify the authenticity of this document.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info - Enhanced */}
        <div className="pt-6 border-t border-slate-700">
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-slate-300">Need Help?</p>
            <p className="text-sm text-slate-400">
              For inquiries, contact NPA at{" "}
              <a 
                href="mailto:info@nigerianports.gov.ng" 
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
              >
                info@nigerianports.gov.ng
              </a>
            </p>
            <div className="flex items-center justify-center gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Retry Verification
                </Button>
              )}
              {onVerifyAnother && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onVerifyAnother}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  Verify Another Seal
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

