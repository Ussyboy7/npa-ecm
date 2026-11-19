"use client";

import { useState, useRef } from "react";
import { logError } from '@/lib/client-logger';
import { CheckCircle2, XCircle, Shield, Calendar, User, FileText, AlertTriangle, ExternalLink, Eye, Copy, Share2, Printer, Download, FileCheck2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSealDate, formatSealDateLong } from "@/lib/datetime";
import { toast } from "@/components/ui/sonner";
import {
  checkSealDocument,
  getSealImageUrl,
  getSealResultState,
  type SealDocumentCheck,
  type SealResultState,
  type SealVerification,
} from "@/lib/api/seal-verification";

interface SealVerificationResultProps {
  verification: SealVerification;
  serial: string;
  onRetry?: () => void;
  onVerifyAnother?: () => void;
}

type FailedResultState = Exclude<SealResultState, 'matched'>;

/**
 * Wording for each way a lookup can end without a matching record. Each
 * variant states what the registry returned, so an outage is never shown as a
 * finding about the seal.
 */
const FAILED_RESULT_VIEW: Record<
  FailedResultState,
  {
    banner: string;
    title: string;
    summary: string;
    serialPanel: string;
    serialLabel: string;
    badge: string;
    badgeText: string;
    icon: typeof XCircle;
    guidancePanel: string;
    guidanceTitle: string;
    guidanceText: string;
    guidance: string;
  }
> = {
  invalidated: {
    banner: "from-red-600 to-red-500",
    title: "Seal record invalidated",
    summary: "This serial exists in NPA ECM, but its seal has been invalidated.",
    serialPanel:
      "border-red-200 bg-gradient-to-r from-red-50 to-red-100/80 dark:border-red-800/30 dark:from-red-950/30 dark:to-red-900/20",
    serialLabel: "text-red-700 dark:text-red-400",
    badge:
      "border-red-300 bg-red-100 text-red-800 dark:border-red-600/50 dark:bg-red-600/20 dark:text-red-400",
    badgeText: "Invalidated",
    icon: XCircle,
    guidancePanel: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
    guidanceTitle: "text-red-700 dark:text-red-400",
    guidanceText: "text-red-600 dark:text-red-300",
    guidance:
      "This seal was recorded against an approved document but has since been withdrawn. Follow NPA guidance before relying on the document.",
  },
  not_found: {
    banner: "from-amber-600 to-amber-500",
    title: "No seal record found",
    summary: "NPA ECM has no seal record for this serial.",
    serialPanel:
      "border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/80 dark:border-amber-800/30 dark:from-amber-950/30 dark:to-amber-900/20",
    serialLabel: "text-amber-700 dark:text-amber-400",
    badge:
      "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-600/50 dark:bg-amber-600/20 dark:text-amber-400",
    badgeText: "Not found",
    icon: AlertTriangle,
    guidancePanel: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50",
    guidanceTitle: "text-amber-800 dark:text-amber-400",
    guidanceText: "text-amber-700 dark:text-amber-200",
    guidance:
      "The registry was checked and returned no record for this serial. Check the serial against the document for typos, or contact NPA. A missing record is not by itself a finding that the document is inauthentic.",
  },
  unavailable: {
    banner: "from-slate-700 to-slate-600",
    title: "Check could not be completed",
    summary: "NPA ECM could not complete the lookup, so no record was checked.",
    serialPanel: "border-border bg-muted/30",
    serialLabel: "text-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
    badgeText: "Not checked",
    icon: AlertTriangle,
    guidancePanel: "border-border bg-muted/40",
    guidanceTitle: "text-foreground",
    guidanceText: "text-muted-foreground",
    guidance:
      "This result says nothing about the seal. Retry the check, or contact NPA if the problem continues.",
  },
};

export function SealVerificationResult({ 
  verification, 
  serial,
  onRetry,
  onVerifyAnother 
}: SealVerificationResultProps) {
  const [copied, setCopied] = useState(false);
  const [documentCheck, setDocumentCheck] = useState<SealDocumentCheck | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [sealImageFailed, setSealImageFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          title: `Seal record: ${verification.serial_number || serial}`,
          text: `Check the seal record for ${verification.serial_number || serial}`,
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

  const handleDownloadSealImage = async () => {
    try {
      const response = await fetch(getSealImageUrl(verification.serial_number || serial));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `seal-${verification.serial_number || serial}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Seal image downloaded');
    } catch (error: unknown) {
      logError('Failed to download seal image:', error);
      toast.error('Failed to download the seal image. Please try again.');
    }
  };

  const handleDocumentCheck = async (file: File | undefined) => {
    if (!file) return;
    setCheckingDocument(true);
    setDocumentCheck(null);
    setDocumentError(null);
    try {
      const result = await checkSealDocument(
        verification.serial_number || serial,
        file,
      );
      setDocumentCheck(result);
    } catch (error) {
      logError("Failed to check approved PDF", error);
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Could not check this PDF. Please try again.",
      );
    } finally {
      setCheckingDocument(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resultState = getSealResultState(verification);

  // The archived-copy comparison has exactly one outcome at a time, including
  // the state before any file is supplied.
  const comparison = documentCheck
    ? {
        label: documentCheck.matches ? "Matched" : "Different",
        detail: documentCheck.matches
          ? "The uploaded file is identical to the archived approved copy."
          : "The uploaded file is not identical to the archived approved copy. It may have changed since approval, or been re-saved or re-exported.",
        tone: documentCheck.matches
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
      }
    : documentError
      ? {
          label: "Could not compare",
          detail: documentError,
          tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
        }
      : {
          label: "Not checked",
          detail: "Upload the PDF to compare it with the archived approved copy.",
          tone: "border-border bg-background text-muted-foreground",
        };

  if (resultState === 'matched') {
    return (
      <Card className="overflow-hidden">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Seal record found</h2>
                <p className="text-emerald-100">The serial matches a seal record in NPA ECM.</p>
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
          {/* Issued seal image: the stored, hash-verified artifact */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 py-6">
            {sealImageFailed ? (
              <p className="text-xs text-muted-foreground">Seal image unavailable.</p>
            ) : (
              /* The issued seal is evidence; the optimizer must not re-encode it. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={getSealImageUrl(verification.serial_number || serial, 440)}
                srcSet={`${getSealImageUrl(verification.serial_number || serial, 220)} 1x, ${getSealImageUrl(verification.serial_number || serial, 440)} 2x`}
                alt={`Issued seal for ${verification.serial_number || serial}`}
                width={220}
                height={220}
                className="rounded-full"
                onError={() => setSealImageFailed(true)}
              />
            )}
          </div>

          {/* Serial Number - Enhanced */}
          <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/80 py-5 text-center dark:border-emerald-800/30 dark:from-emerald-950/30 dark:to-emerald-900/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Serial Number</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-2xl font-mono font-bold text-foreground tracking-wider">{verification.serial_number}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySerial}
                className="h-8 w-8 p-0 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
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
              <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-600/20 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Record found
              </Badge>
            </div>
          </div>

          {/* Details - Enhanced Grid Layout */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-border/80">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-xs text-muted-foreground">Sealed By</p>
                  <p className="text-sm font-semibold text-foreground">{verification.sealed_by}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{verification.office_title}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-border/80">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-xs text-muted-foreground">Organization</p>
                  <p className="text-sm font-semibold text-foreground">{verification.office_name}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-border/80">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-xs text-muted-foreground">Date & Time</p>
                  <p className="text-sm font-semibold text-foreground">{formatSealDate(verification.sealed_at)}</p>
                </div>
              </div>
            </div>

            {(verification.document_title || verification.correspondence_subject) && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-border/80 md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">Document</p>
                    <p className="mb-2 break-words text-sm font-semibold text-foreground">
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

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-600/20">
                <FileCheck2 className="h-5 w-5 text-sky-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Compare a PDF with the archived approved copy</p>
                {verification.pdf_sha256 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    This compares the SHA-256 fingerprint of the PDF you upload with the archived approved copy for this seal.
                    It shows whether the two files are identical — not legal validity or every aspect of a document&apos;s authenticity.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Not checked: no archived approved copy is available for this seal, so an uploaded file cannot be compared.
                  </p>
                )}
                {verification.pdf_sha256 && (
                  <div className="mt-3 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
                      onChange={(event) => void handleDocumentCheck(event.target.files?.[0])}
                      disabled={checkingDocument}
                      aria-label="Upload approved-copy PDF to compare"
                    />
                    {checkingDocument ? (
                      <p className="text-xs text-muted-foreground">Comparing file…</p>
                    ) : (
                      <div
                        className={`rounded-md border p-3 text-xs ${comparison.tone}`}
                        role="status"
                      >
                        <p className="font-semibold">{comparison.label}</p>
                        <p className="mt-1">{comparison.detail}</p>
                        {documentCheck && (
                          <p className="mt-1 font-mono break-all opacity-80">
                            SHA-256: {documentCheck.actual_sha256}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Enhanced */}
          <div className="border-t border-border pt-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Seal record matched</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  Checked on {formatSealDateLong(new Date().toISOString())}
                </p>
                <p className="max-w-md text-xs text-muted-foreground/80">
                  A record match confirms that this serial exists in NPA ECM. It is not, by itself, a determination
                  that a document is authentic. Compare the details with the document you hold and follow NPA policy.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownloadSealImage()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download seal image
                </Button>
                {onVerifyAnother && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onVerifyAnother}
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

  // No matching record: invalidated, absent, or the check did not complete.
  const failedView = FAILED_RESULT_VIEW[resultState];
  const StateIcon = failedView.icon;

  return (
    <Card className="overflow-hidden">
      {/* Outcome Banner */}
      <div className={`bg-gradient-to-r ${failedView.banner} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
              <StateIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{failedView.title}</h2>
              <p className="text-white/90">{failedView.summary}</p>
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
        <div className={`rounded-lg border py-5 text-center ${failedView.serialPanel}`}>
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${failedView.serialLabel}`}>Serial Number</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-2xl font-mono font-bold text-foreground tracking-wider">{serial}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopySerial}
              className="h-8 w-8 p-0 text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
            <Badge
              variant={resultState === 'invalidated' ? 'destructive' : 'outline'}
              className={failedView.badge}
            >
              <StateIcon className="h-3 w-3 mr-1" />
              {failedView.badgeText}
            </Badge>
          </div>
        </div>

        {verification.invalidated_at && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">This seal was invalidated</p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  Date: {formatSealDate(verification.invalidated_at)}
                </p>
                {verification.invalidated_reason && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                    Reason: {verification.invalidated_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What the outcome means */}
        <div className={`rounded-lg border p-4 ${failedView.guidancePanel}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${failedView.guidanceTitle}`} />
            <div>
              <p className={`text-sm font-medium ${failedView.guidanceTitle}`}>What this means</p>
              <p className={`mt-1 text-xs ${failedView.guidanceText}`}>{failedView.guidance}</p>
              {resultState === 'unavailable' && verification.error && (
                <p className={`mt-1 text-xs ${failedView.guidanceText}`}>Details: {verification.error}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info - Enhanced */}
        <div className="border-t border-border pt-6">
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-foreground">Need Help?</p>
            <p className="text-sm text-muted-foreground">
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

