"use client";

import Image from 'next/image';
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
import { appType } from '@/lib/app-type';

interface SecuritySectionProps {
  twoFactorEnabled: boolean;
  totpEnabled: boolean;
  otpEnabled: boolean;
  showSetup2FA: boolean;
  twoFactorMethod: 'totp' | 'email_otp';
  twoFactorSecret: string;
  twoFactorQRCode: string;
  verificationCode: string;
  backupCodes: string[];
  showBackupCodes: boolean;
  isEnabling2FA: boolean;
  isLoading2FAStatus: boolean;
  otpSent: boolean;
  otpCountdown: number;
  showPasswordDialog: boolean;
  email?: string;
  onSetup2FA: (method: 'totp' | 'email_otp') => void;
  onSendEmailOTP: () => void;
  onVerify2FA: () => void;
  onDisable2FA: (method: 'totp' | 'email_otp') => void;
  onRegenerateBackupCodes: () => void;
  onCopyBackupCodes: () => void;
  onVerificationCodeChange: (code: string) => void;
  onPasswordDialogChange: (open: boolean) => void;
  onSetup2FADialogChange: (open: boolean) => void;
  onBackupCodesDialogChange: (open: boolean) => void;
}

export function SecuritySection({
  twoFactorEnabled,
  totpEnabled,
  otpEnabled,
  showSetup2FA,
  twoFactorMethod,
  twoFactorSecret,
  twoFactorQRCode,
  verificationCode,
  backupCodes,
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
  onCopyBackupCodes,
  onVerificationCodeChange,
  onPasswordDialogChange,
  onSetup2FADialogChange,
  onBackupCodesDialogChange,
}: SecuritySectionProps) {
  return (
    <TabsContent value="security" className="space-y-4">
      {/* 2FA */}
      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={`${appType.panelTitle} flex items-center gap-2`}>
            <Shield className="h-4 w-4" />
            Two-Factor Authentication
          </h2>
          <p className={appType.caption}>
            Add an extra layer of security to your account. Choose between authenticator app or email verification.
          </p>
        </div>
        <div className="space-y-4 p-4">
          {isLoading2FAStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading 2FA status...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {twoFactorEnabled ? (
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
                      {twoFactorEnabled ? '2FA is enabled' : '2FA is not enabled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? 'Your account is protected with two-factor authentication'
                        : 'Enable at least one 2FA method to protect your account'}
                    </p>
                  </div>
                </div>
                {twoFactorEnabled && (
                  <Button variant="outline" size="sm" onClick={() => onBackupCodesDialogChange(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Backup Codes
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Authenticator App
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
                        {totpEnabled ? 'Authenticator enabled' : 'Not configured'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use Google Authenticator, Authy, or similar apps
                      </p>
                    </div>
                  </div>
                  {totpEnabled ? (
                    <Button variant="destructive" size="sm" onClick={() => onDisable2FA('totp')}>
                      Disable
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onSetup2FA('totp')}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Verification
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
                        {otpEnabled ? 'Email OTP enabled' : 'Not configured'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Receive verification codes via email ({email || 'No email set'})
                      </p>
                    </div>
                  </div>
                  {otpEnabled ? (
                    <Button variant="destructive" size="sm" onClick={() => onDisable2FA('email_otp')}>
                      Disable
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onSetup2FA('email_otp')}>
                      <Mail className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                  )}
                </div>
              </div>

              {twoFactorEnabled && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                  <p className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Check className="h-4 w-4" />
                    Two-factor authentication is active. You&apos;ll need to verify your identity for sensitive actions.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(twoFactorQRCode)}`}
                      alt="2FA QR Code"
                      width={192}
                      height={192}
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
      <Dialog open={showBackupCodes} onOpenChange={onBackupCodesDialogChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </DialogTitle>
            <DialogDescription>
              Save these backup codes in a secure location. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Keep these codes safe. If you lose access to your authenticator app, you can use these codes to sign in.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-background rounded text-center">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCopyBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                const content = backupCodes.join('\n');
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'npa-ecm-backup-codes.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={onRegenerateBackupCodes}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Generate New Codes
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => onBackupCodesDialogChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginMFASection />
    </TabsContent>
  );
}
