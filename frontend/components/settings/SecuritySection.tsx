"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Loader2,
  ShieldCheck,
  Smartphone,
  Check,
  QrCode,
  Mail,
  Key,
  Copy,
  Download,
  AlertTriangle,
  RefreshCcw,
  Lock,
} from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import { LoginMFASection } from '@/components/settings/LoginMFASection';
import { StepUpDialog } from '@/components/settings/StepUpDialog';
import { appType } from '@/lib/app-type';

type DisableCredential = { code?: string; password?: string };

interface SecuritySectionProps {
  seal2FARequired: boolean;
  hasSignature: boolean;
  sealSignatureActive: boolean;
  totpEnabled: boolean;
  otpEnabled: boolean;
  showSetup2FA: boolean;
  twoFactorMethod: 'totp' | 'email_otp';
  twoFactorSecret: string;
  twoFactorQRCode: string;
  verificationCode: string;
  backupCodes: string[];
  backupCodesRemaining: number;
  showBackupCodes: boolean;
  isEnabling2FA: boolean;
  isLoading2FAStatus: boolean;
  otpSent: boolean;
  otpCountdown: number;
  email?: string;
  onSetup2FA: (method: 'totp' | 'email_otp') => void;
  onSendEmailOTP: () => void;
  onVerify2FA: () => void;
  onDisable2FA: (method: 'totp' | 'email_otp', credential: DisableCredential) => Promise<void>;
  onRegenerateBackupCodes: (password: string) => Promise<void>;
  onOpenBackupCodes: () => void;
  onCopyBackupCodes: () => void;
  onVerificationCodeChange: (code: string) => void;
  onPasswordDialogChange: (open: boolean) => void;
  onSetup2FADialogChange: (open: boolean) => void;
  onBackupCodesDialogChange: (open: boolean) => void;
}

export function SecuritySection({
  seal2FARequired,
  hasSignature,
  sealSignatureActive,
  totpEnabled,
  otpEnabled,
  showSetup2FA,
  twoFactorMethod,
  twoFactorSecret,
  twoFactorQRCode,
  verificationCode,
  backupCodes,
  backupCodesRemaining,
  showBackupCodes,
  isEnabling2FA,
  isLoading2FAStatus,
  otpSent,
  otpCountdown,
  email,
  onSetup2FA,
  onSendEmailOTP,
  onVerify2FA,
  onDisable2FA,
  onRegenerateBackupCodes,
  onOpenBackupCodes,
  onCopyBackupCodes,
  onVerificationCodeChange,
  onPasswordDialogChange,
  onSetup2FADialogChange,
  onBackupCodesDialogChange,
}: SecuritySectionProps) {
  const [stepUpAction, setStepUpAction] = useState<'totp' | 'email' | 'codes' | null>(null);
  const [codesSaved, setCodesSaved] = useState(false);

  useEffect(() => {
    if (!showBackupCodes) setCodesSaved(false);
  }, [showBackupCodes]);

  useEffect(() => {
    setCodesSaved(false);
  }, [backupCodes]);

  const runStepUp = async (value: string) => {
    if (stepUpAction === 'totp') {
      await onDisable2FA('totp', { password: value });
    } else if (stepUpAction === 'email') {
      await onDisable2FA('email_otp', { password: value });
    } else if (stepUpAction === 'codes') {
      await onRegenerateBackupCodes(value);
    }
  };

  return (
    <TabsContent value="security" className="space-y-4">
      <LoginMFASection />

      {/* Seal protection */}
      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={`${appType.panelTitle} flex items-center gap-2`}>
            <Shield className="h-4 w-4" />
            Seal protection
          </h2>
          <p className={appType.caption}>
            Controls verification before applying your digital seal. Sign-in MFA is separate.
          </p>
        </div>
        <div className="space-y-4 p-4">
          {isLoading2FAStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading seal verification settings...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {hasSignature && sealSignatureActive && seal2FARequired && (otpEnabled || totpEnabled || backupCodesRemaining > 0) ? (
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {!hasSignature
                        ? 'No digital signature is set up'
                        : !sealSignatureActive
                        ? 'Digital signature is inactive'
                        : seal2FARequired
                        ? 'Seal verification is required'
                        : 'Seal verification is not required'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {!hasSignature
                        ? 'Upload a signature to configure verification for seal applications.'
                        : !sealSignatureActive
                        ? 'Activate your signature to apply seals. Verification settings below take effect when it is active.'
                        : seal2FARequired && (otpEnabled || totpEnabled)
                        ? `Use ${otpEnabled && totpEnabled ? 'email codes or an authenticator app' : otpEnabled ? 'email codes' : 'an authenticator app'} when applying a seal.${backupCodesRemaining > 0 ? ' An unused backup code is another one-time option.' : ''}`
                        : seal2FARequired && backupCodesRemaining > 0
                        ? 'No email or authenticator method is configured. An unused backup code can verify a seal; set up a method for regular use.'
                        : seal2FARequired
                        ? 'Set up email codes or an authenticator app before applying a seal.'
                        : 'Applying a seal will not require a verification code.'}
                    </p>
                  </div>
                </div>
                {hasSignature && (totpEnabled || otpEnabled || backupCodesRemaining > 0) && (
                  <Button variant="outline" size="sm" onClick={onOpenBackupCodes}>
                    <Key className="h-4 w-4 mr-2" />
                    Backup codes
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                                                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Authenticator app for seals
                </h4>


                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {totpEnabled ? (
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {totpEnabled ? 'Enabled for seal verification' : 'Not configured'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use codes from an authenticator app when applying a seal
                      </p>
                    </div>
                  </div>
                  {totpEnabled ? (
                    <Button variant="destructive" size="sm" onClick={() => setStepUpAction('totp')}>
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onSetup2FA('totp')}
                      disabled={!hasSignature || !sealSignatureActive}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email codes for seals
                </h4>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {otpEnabled ? (
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {otpEnabled
                          ? 'Email codes available for seal verification'
                          : hasSignature && email?.trim()
                          ? 'Disabled for seal verification'
                          : 'Not available'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {otpEnabled
                          ? `Codes will be sent to ${email}`
                          : !hasSignature
                          ? 'Set up a digital signature before configuring seal verification'
                          : !email?.trim()
                          ? 'Add an email address in Profile to use email codes'
                          : 'Enable email codes to use them for seal verification'}
                      </p>
                    </div>
                  </div>
                  {otpEnabled ? (
                    <Button variant="destructive" size="sm" onClick={() => setStepUpAction('email')}>
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onSetup2FA('email_otp')}
                      disabled={!hasSignature || !sealSignatureActive || !email?.trim()}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                  )}
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetup2FA} onOpenChange={onSetup2FADialogChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {twoFactorMethod === 'totp' ? (
                <>
                  <Smartphone className="h-5 w-5" />
                  Set Up Authenticator App
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  Set Up Email Verification
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {twoFactorMethod === 'totp'
                ? 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)'
                : `We'll send a verification code to ${email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {twoFactorMethod === 'totp' ? (
              <>
                <div className="flex justify-center p-4 doc-paper rounded-lg">
                  {twoFactorQRCode ? (
                    <Image
                      src={twoFactorQRCode}
                      alt="2FA QR Code"
                      width={192}
                      height={192}
                      unoptimized
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-muted flex items-center justify-center rounded">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Can&apos;t scan? Enter this code manually:</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{twoFactorSecret}</code>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(twoFactorSecret);
                      toast.success('Code copied');
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Enter verification code from your app:</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
              </>
            ) : (
              <>
                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click the button below to receive a verification code at:
                      </p>
                      <p className="font-medium mt-1">{email}</p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={onSendEmailOTP}
                      disabled={isEnabling2FA}
                    >
                      {isEnabling2FA ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <Check className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Verification code sent to {email}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Code expires in 5 minutes
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Enter the 6-digit code from your email:</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-2xl tracking-widest"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onSendEmailOTP}
                      disabled={otpCountdown > 0 || isEnabling2FA}
                    >
                      {otpCountdown > 0
                        ? `Resend code in ${otpCountdown}s`
                        : 'Resend Code'
                      }
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onSetup2FADialogChange(false)}>Cancel</Button>
            {(twoFactorMethod === 'totp' || otpSent) && (
              <Button
                onClick={onVerify2FA}
                disabled={verificationCode.length !== 6 || isEnabling2FA}
              >
                {isEnabling2FA ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog
        open={showBackupCodes}
        onOpenChange={(open) => {
          if (!open && backupCodes.length > 0 && !codesSaved) {
            toast.error('Confirm that you have saved the backup codes first.');
            return;
          }
          onBackupCodesDialogChange(open);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure location. Each code is single-use and can sign in or complete seal verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Keep these codes safe. They are shown only once. Generating new codes invalidates every existing code.
                </p>
              </div>
            </div>

            {backupCodes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code) => (
                  <div key={code} className="p-2 bg-background rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Backup codes are stored hashed and cannot be shown again.
                {backupCodesRemaining > 0
                  ? ` ${backupCodesRemaining} unused code${backupCodesRemaining === 1 ? '' : 's'} remain.`
                  : ' Generate a new set below.'}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCopyBackupCodes} disabled={backupCodes.length === 0}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={backupCodes.length === 0}
                onClick={() => {
                  const content = backupCodes.join('\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'npa-ecm-backup-codes.txt';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setStepUpAction('codes')}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Generate New Codes
            </Button>

            {backupCodes.length > 0 && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={codesSaved}
                  onChange={(event) => setCodesSaved(event.target.checked)}
                />
                <span>I have saved these codes somewhere secure.</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => onBackupCodesDialogChange(false)}
              disabled={backupCodes.length > 0 && !codesSaved}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepUpDialog
        open={stepUpAction !== null}
        onOpenChange={(open) => {
          if (!open) setStepUpAction(null);
        }}
        title={
          stepUpAction === 'totp'
            ? 'Disable authenticator app'
            : stepUpAction === 'email'
            ? 'Disable email OTP'
            : 'Generate new backup codes'
        }
        description={
          stepUpAction === 'totp'
            ? 'Confirm your password to remove the authenticator from this account.'
            : stepUpAction === 'email'
            ? 'Confirm your password before disabling email OTP.'
            : 'Confirm your password before replacing all existing backup codes.'
        }
        mode="password"
        confirmLabel={
          stepUpAction === 'totp'
            ? 'Disable authenticator'
            : stepUpAction === 'email'
            ? 'Disable email OTP'
            : 'Generate codes'
        }
        onConfirm={runStepUp}
      />

      {/* Password */}
      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={appType.panelTitle}>Change Password</h2>
          <p className={appType.caption}>
            Use a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
          </p>
        </div>
        <div className="p-4">
          <Button size="sm" onClick={() => onPasswordDialogChange(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
