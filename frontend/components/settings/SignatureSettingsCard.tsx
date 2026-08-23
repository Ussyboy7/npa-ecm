"use client";

import { DEFAULT_SEAL_OFFICE_NAME } from '@/lib/branding';
import { ALLOWED_SIGNATURE_MIME_TYPES, ACCEPT_IMAGE_SIGNATURE } from '@/lib/file-types';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import {
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  ImageIcon,
  Info,
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DigitalSealPreview, type DigitalSealPreviewHandle } from '@/components/seals/DigitalSealPreview';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  fetchUserSignature,
  uploadUserSignature,
  updateSignatureSettings,
  type StoredSignature,
} from '@/lib/api/signatures';
import { emitSignatureUpdated } from '@/hooks/use-signature';
import { logError } from '@/lib/client-logger';
import { formatDateShort } from '@/lib/datetime';
import { appType } from '@/lib/app-type';
import { cn } from '@/lib/utils';

const MAX_SIGNATURE_SIZE_MB = 2;
const MAX_OFFICE_NAME_LENGTH = 100;
const MAX_OFFICE_TITLE_LENGTH = 100;
const MAX_PREFIX_LENGTH = 10;

const DEFAULT_SEAL_SETTINGS = {
  sealOfficeName: DEFAULT_SEAL_OFFICE_NAME,
  sealOfficeTitle: '',
  sealPrefix: 'NPA',
  require2fa: true,
};

export const SignatureSettingsCard = () => {
  const { currentUser } = useCurrentUser();
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const sealPreviewRef = useRef<DigitalSealPreviewHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sealOfficeName, setSealOfficeName] = useState(DEFAULT_SEAL_OFFICE_NAME);
  const [sealOfficeTitle, setSealOfficeTitle] = useState('');
  const [sealPrefix, setSealPrefix] = useState('NPA');
  const [require2fa, setRequire2fa] = useState(true);
  const [errors, setErrors] = useState<{
    officeName?: string;
    officeTitle?: string;
    prefix?: string;
    file?: string;
  }>({});
  const [captureMode, setCaptureMode] = useState<'draw' | 'upload'>('draw');

  useEffect(() => {
    const loadSignature = async () => {
      if (!currentUser?.id) return;
      setIsLoading(true);
      try {
        const sig = await fetchUserSignature();
        if (sig) {
          setSignature(sig);
          setSealOfficeName(sig.sealOfficeName || DEFAULT_SEAL_SETTINGS.sealOfficeName);
          setSealOfficeTitle(sig.sealOfficeTitle || DEFAULT_SEAL_SETTINGS.sealOfficeTitle);
          setSealPrefix(sig.sealPrefix || DEFAULT_SEAL_SETTINGS.sealPrefix);
          setRequire2fa(sig.require2fa ?? DEFAULT_SEAL_SETTINGS.require2fa);
        }
      } catch (error: unknown) {
        logError('Failed to load signature', error);
        toast.error('Failed to load signature settings');
      } finally {
        setIsLoading(false);
      }
    };
    void loadSignature();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!sealOfficeTitle && currentUser?.systemRole) {
      setSealOfficeTitle(`OFFICE OF THE ${currentUser.systemRole.toUpperCase()}`);
    }
  }, [currentUser?.systemRole, sealOfficeTitle]);

  useEffect(() => {
    if (!signature) return;
    setHasUnsavedChanges(
      sealOfficeName !== (signature.sealOfficeName || DEFAULT_SEAL_SETTINGS.sealOfficeName) ||
        sealOfficeTitle !== (signature.sealOfficeTitle || DEFAULT_SEAL_SETTINGS.sealOfficeTitle) ||
        sealPrefix !== (signature.sealPrefix || DEFAULT_SEAL_SETTINGS.sealPrefix) ||
        require2fa !== (signature.require2fa ?? DEFAULT_SEAL_SETTINGS.require2fa)
    );
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  const validateOfficeName = (value: string): string | undefined => {
    if (!value.trim()) return 'Organization name is required';
    if (value.length > MAX_OFFICE_NAME_LENGTH) return `Maximum ${MAX_OFFICE_NAME_LENGTH} characters`;
    return undefined;
  };

  const validateOfficeTitle = (value: string): string | undefined => {
    if (value.length > MAX_OFFICE_TITLE_LENGTH) return `Maximum ${MAX_OFFICE_TITLE_LENGTH} characters`;
    return undefined;
  };

  const validatePrefix = (value: string): string | undefined => {
    if (!value.trim()) return 'Serial prefix is required';
    if (value.length > MAX_PREFIX_LENGTH) return `Maximum ${MAX_PREFIX_LENGTH} characters`;
    if (!/^[A-Z0-9-]+$/.test(value)) return 'Use uppercase letters, numbers, and hyphens only';
    return undefined;
  };

  const persistSignatureFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const uploaded = await uploadUserSignature(file, {
          sealOfficeName,
          sealOfficeTitle,
          sealPrefix,
          require2fa,
        });
        if (uploaded) {
          setSignature(uploaded);
          emitSignatureUpdated();
          toast.success('Signature saved');
        }
      } catch (error: unknown) {
        logError('Failed to save signature', error);
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? (error as { status?: number }).status
            : undefined;
        let message = 'Failed to save signature';
        if (status === 413) message = 'File is too large';
        else if (status === 400) message = 'Invalid file format';
        else if (error instanceof Error && error.message) message = error.message;
        setErrors((prev) => ({ ...prev, file: message }));
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]
  );

  const handleSignatureUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setErrors((prev) => ({ ...prev, file: undefined }));

      if (file.size > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
        const message = `Max size is ${MAX_SIGNATURE_SIZE_MB}MB`;
        setErrors((prev) => ({ ...prev, file: message }));
        toast.error(message);
        event.target.value = '';
        return;
      }
      if (!ALLOWED_SIGNATURE_MIME_TYPES.includes(file.type)) {
        const message = 'Use PNG, JPG, or SVG';
        setErrors((prev) => ({ ...prev, file: message }));
        toast.error(message);
        event.target.value = '';
        return;
      }

      await persistSignatureFile(file);
      event.target.value = '';
    },
    [persistSignatureFile]
  );

  const handleDrawSave = useCallback(
    async (dataUrl: string) => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'drawn-signature.png', { type: 'image/png' });
      await persistSignatureFile(file);
    },
    [persistSignatureFile]
  );

  const handleSaveSettings = useCallback(async () => {
    if (!signature) return;
    const officeNameError = validateOfficeName(sealOfficeName);
    const officeTitleError = validateOfficeTitle(sealOfficeTitle);
    const prefixError = validatePrefix(sealPrefix);
    if (officeNameError || officeTitleError || prefixError) {
      setErrors({
        officeName: officeNameError,
        officeTitle: officeTitleError,
        prefix: prefixError,
      });
      toast.error('Fix the highlighted fields');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateSignatureSettings({
        sealOfficeName,
        sealOfficeTitle,
        sealPrefix,
        require2fa,
      });
      if (updated) {
        setSignature(updated);
        setHasUnsavedChanges(false);
        toast.success('Seal settings saved');
      }
    } catch (error: unknown) {
      logError('Failed to save settings', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [signature, sealOfficeName, sealOfficeTitle, sealPrefix, require2fa]);

  const handleResetToDefaults = useCallback(() => {
    setSealOfficeName(DEFAULT_SEAL_SETTINGS.sealOfficeName);
    setSealOfficeTitle(
      currentUser?.systemRole
        ? `OFFICE OF THE ${currentUser.systemRole.toUpperCase()}`
        : DEFAULT_SEAL_SETTINGS.sealOfficeTitle
    );
    setSealPrefix(DEFAULT_SEAL_SETTINGS.sealPrefix);
    setRequire2fa(DEFAULT_SEAL_SETTINGS.require2fa);
    setErrors({});
  }, [currentUser?.systemRole]);

  const handleDownloadSeal = useCallback(() => {
    if (!sealPreviewRef.current) {
      toast.error('Seal preview not ready');
      return;
    }
    sealPreviewRef.current.download();
    toast.success('Seal downloaded');
  }, []);

  const handlePrintSeal = useCallback(() => {
    const canvas = sealPreviewRef.current?.getCanvas();
    if (!canvas) {
      toast.error('Seal preview not ready');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow popups to print');
      return;
    }
    const imgData = canvas.toDataURL('image/png');
    printWindow.document.write(`
      <html><head><title>Seal</title>
      <style>body{margin:0;padding:40px;display:flex;justify-content:center;align-items:center;min-height:100vh}
      img{max-width:100%;height:auto}@media print{body{padding:0}}</style></head>
      <body><img src="${imgData}" alt="Digital Seal" /></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading signature…</span>
      </div>
    );
  }

  const signatureSrc = signature?.imageData || undefined;
  const officeTitleDisplay =
    sealOfficeTitle || `OFFICE OF THE ${currentUser?.systemRole?.toUpperCase() || 'EXECUTIVE'}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className={appType.panelTitle}>Digital Signature & Executive Seal</h2>
        <p className={appType.caption}>
          Choose one way to set your signature — draw or upload. The seal updates live.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        {/* Capture */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div>
              <p className={appType.sectionLabel}>Your signature</p>
              <p className={appType.caption}>
                {signatureSrc
                  ? `Saved ${formatDateShort(signature!.uploadedAt)}`
                  : 'Not set yet'}
              </p>
            </div>

            <div className="rounded-lg border doc-paper flex items-center justify-center min-h-[88px] px-4 py-3">
              {signatureSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={signatureSrc}
                  alt="Your signature"
                  className="max-h-16 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-4 w-4 opacity-50" />
                  <span className="text-sm">No signature yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="flex gap-2">
              {(['draw', 'upload'] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={captureMode === mode ? 'default' : 'outline'}
                  size="compact"
                  className="flex-1"
                  onClick={() => setCaptureMode(mode)}
                >
                  {mode === 'draw' ? 'Draw' : 'Upload'}
                </Button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_IMAGE_SIGNATURE}
              className="hidden"
              onChange={handleSignatureUpload}
              disabled={isUploading}
            />

            {captureMode === 'draw' ? (
              <SignaturePad onSave={handleDrawSave} />
            ) : (
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full rounded-lg border border-dashed border-border/80 bg-background/60 px-4 py-10',
                  'text-center transition-colors hover:bg-muted/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isUploading && 'opacity-60 pointer-events-none'
                )}
              >
                <ImageIcon className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-60" />
                <p className="text-sm font-medium text-foreground">Choose an image</p>
                <p className={cn(appType.caption, 'mt-1')}>
                  PNG, JPG, or SVG · max {MAX_SIGNATURE_SIZE_MB}MB
                </p>
              </button>
            )}

            {errors.file && (
              <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                <XCircle className="h-3 w-3" />
                {errors.file}
              </p>
            )}
            {isUploading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </p>
            )}
          </div>
        </div>

        {/* Seal rail */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className={appType.sectionLabel}>Live seal</p>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="quiet"
                  onClick={handleDownloadSeal}
                  disabled={!signatureSrc}
                  aria-label="Download seal"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="quiet"
                  onClick={handlePrintSeal}
                  disabled={!signatureSrc}
                  aria-label="Print seal"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <DigitalSealPreview
                ref={sealPreviewRef}
                officeName={sealOfficeName}
                officeTitle={officeTitleDisplay}
                serialPrefix={sealPrefix}
                signatureImage={signatureSrc}
                size={260}
                showQR={true}
              />
            </div>

            {signature && (
              <p className={cn(appType.caption, 'text-center')}>
                Used {signature.timesUsed || 0} time{(signature.timesUsed || 0) === 1 ? '' : 's'}
                {signature.lastUsedAt ? ` · last ${formatDateShort(signature.lastUsedAt)}` : ''}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className={appType.sectionLabel}>Seal settings</p>
              {hasUnsavedChanges && (
                <span className={appType.caption}>Unsaved</span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sealOfficeName" className="text-xs">
                  Organization
                </Label>
                <Input
                  id="sealOfficeName"
                  value={sealOfficeName}
                  onChange={(e) => {
                    setSealOfficeName(e.target.value);
                    setErrors((prev) => ({ ...prev, officeName: validateOfficeName(e.target.value) }));
                  }}
                  maxLength={MAX_OFFICE_NAME_LENGTH}
                  aria-invalid={!!errors.officeName}
                />
                {errors.officeName && (
                  <p className="text-xs text-destructive">{errors.officeName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sealOfficeTitle" className="text-xs">
                  Office title
                </Label>
                <Input
                  id="sealOfficeTitle"
                  value={sealOfficeTitle}
                  onChange={(e) => {
                    setSealOfficeTitle(e.target.value);
                    setErrors((prev) => ({ ...prev, officeTitle: validateOfficeTitle(e.target.value) }));
                  }}
                  maxLength={MAX_OFFICE_TITLE_LENGTH}
                  aria-invalid={!!errors.officeTitle}
                />
                {errors.officeTitle && (
                  <p className="text-xs text-destructive">{errors.officeTitle}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sealPrefix" className="text-xs">
                  Serial prefix
                </Label>
                <Input
                  id="sealPrefix"
                  value={sealPrefix}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase();
                    setSealPrefix(upper);
                    setErrors((prev) => ({ ...prev, prefix: validatePrefix(upper) }));
                  }}
                  maxLength={MAX_PREFIX_LENGTH}
                  className="uppercase"
                  aria-invalid={!!errors.prefix}
                />
                {errors.prefix && <p className="text-xs text-destructive">{errors.prefix}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Label htmlFor="require2fa" className="text-xs flex items-center gap-1.5 font-normal">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Require 2FA to seal
                </Label>
                <Switch
                  id="require2fa"
                  checked={require2fa}
                  onCheckedChange={(checked) => {
                    setRequire2fa(checked);
                    if (checked) setShow2FADialog(true);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                size="compact"
                className="flex-1"
                onClick={handleSaveSettings}
                disabled={isSaving || !signature || !hasUnsavedChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Save
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="quiet"
                onClick={handleResetToDefaults}
                aria-label="Reset seal settings"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              2FA for seals
            </DialogTitle>
            <DialogDescription>
              Turn on authenticator 2FA under Settings → Security to protect seal application.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>You can keep this requirement on and finish 2FA setup later.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="compact"
              onClick={() => {
                setRequire2fa(false);
                setShow2FADialog(false);
              }}
            >
              Turn off
            </Button>
            <Button size="compact" onClick={() => setShow2FADialog(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignatureSettingsCard;
