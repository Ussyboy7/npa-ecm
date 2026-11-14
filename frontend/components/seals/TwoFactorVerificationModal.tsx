"use client";

import Image from 'next/image';
import { useState, useEffect, useRef } from "react";
import { logError } from '@/lib/client-logger';
import { 
  Mail, 
  Smartphone, 
  Shield, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";

interface TwoFactorVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (verificationToken: string) => void;
  correspondenceId?: string;
  documentId?: string;
  title?: string;
  description?: string;
}

interface TwoFactorStatus {
  require_2fa: boolean;
  totp_enabled: boolean;
  totp_confirmed: boolean;
  preferred_method: "email" | "totp";
  email: string;
  has_email: boolean;
  available_methods: string[];
  can_seal?: boolean;
  requires_verification?: boolean;
  blocking_reason?: "no_signature" | "signature_inactive" | "no_2fa_method" | null;
  recovery_actions?: Array<{
    action: string;
    label: string;
    endpoint?: string;
    method?: string;
  }>;
}

export function TwoFactorVerificationModal({
  open,
  onOpenChange,
  onVerified,
  correspondenceId,
  documentId,
  title = "Verify Your Identity",
  description = "Enter the verification code to apply the digital seal",
}: TwoFactorVerificationModalProps) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "totp" | "backup_code">("email");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Email OTP state
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  
  // TOTP state
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qr_code: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  // Refs for auto-focus
  const emailInputRef = useRef<HTMLInputElement>(null);
  const totpInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Load 2FA status when modal opens
  useEffect(() => {
    if (open) {
      loadStatus();
    } else {
      // Reset state when modal closes
      setOtpSent(false);
      setOtpCode("");
      setTotpCode("");
      setBackupCode("");
      setError(null);
      setRemainingAttempts(null);
      setShowSetup(false);
    }
  }, [open]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus input when tab changes
  useEffect(() => {
    if (activeTab === "email" && otpSent) {
      emailInputRef.current?.focus();
    } else if (activeTab === "totp") {
      totpInputRef.current?.focus();
    } else if (activeTab === "backup_code") {
      backupInputRef.current?.focus();
    }
  }, [activeTab, otpSent]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<TwoFactorStatus>("/accounts/2fa/status/");
      setStatus(data);
      const preferredAvailable = data.available_methods.includes(data.preferred_method);
      if (preferredAvailable) {
        setActiveTab(data.preferred_method);
      } else if (data.available_methods.includes("totp")) {
        setActiveTab("totp");
      } else if (data.available_methods.includes("email")) {
        setActiveTab("email");
      } else if (data.available_methods.includes("backup_code")) {
        setActiveTab("backup_code");
      } else {
        // No method is configured. Open the authenticator setup path so the
        // required second factor can be created instead of leaving a dead end.
        setActiveTab("totp");
      }
    } catch (err) {
      logError("Failed to load 2FA status:", err);
      toast.error("Failed to load 2FA settings");
    } finally {
      setLoading(false);
    }
  };

  const requestEmailOTP = async () => {
    try {
      setSending(true);
      setError(null);
      
      const response = await apiFetch<{ otp_id: string; message: string; expires_in: number }>(
        "/accounts/2fa/email/request/",
        {
          method: "POST",
          body: JSON.stringify({
            correspondence_id: correspondenceId,
            document_id: documentId,
          }),
        }
      );
      
      setOtpId(response.otp_id);
      setOtpSent(true);
      setCountdown(60); // 60 seconds before resend allowed
      toast.success(response.message);
      
      // Focus input
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setSending(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (!otpId || otpCode.length !== 6) return;
    
    try {
      setVerifying(true);
      setError(null);
      
      const response = await apiFetch<{
        verified: boolean;
        verification_token?: string;
        error?: string;
        remaining_attempts?: number;
      }>("/accounts/2fa/email/verify/", {
        method: "POST",
        body: JSON.stringify({
          otp_id: otpId,
          code: otpCode,
        }),
      });
      
      if (response.verified && response.verification_token) {
        toast.success("Verification successful!");
        onVerified(response.verification_token);
        onOpenChange(false);
      } else {
        setError(response.error || "Verification failed");
        setRemainingAttempts(response.remaining_attempts ?? null);
        setOtpCode("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const verifyTOTP = async () => {
    if (totpCode.length !== 6) return;
    
    try {
      setVerifying(true);
      setError(null);
      
      const response = await apiFetch<{
        verified: boolean;
        verification_token?: string;
        error?: string;
      }>("/accounts/2fa/totp/verify/", {
        method: "POST",
        body: JSON.stringify({
          code: totpCode,
          purpose: showSetup ? "setup" : "verify",
        }),
      });
      
      if (response.verified && response.verification_token) {
        if (showSetup) {
          toast.success("Authenticator app setup complete. Generate backup codes in Settings.");
          setShowSetup(false);
          setSetupData(null);
          // The setup code already proved possession of the new factor. Use
          // the returned token to continue the seal flow immediately.
          onVerified(response.verification_token);
          onOpenChange(false);
        } else {
          toast.success("Verification successful!");
          onVerified(response.verification_token);
          onOpenChange(false);
        }
      } else {
        setError(response.error || "Invalid code");
        setTotpCode("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setTotpCode("");
    } finally {
      setVerifying(false);
    }
  };

  const setupTOTP = async () => {
    try {
      setSending(true);
      setError(null);
      
      const response = await apiFetch<{
        secret: string;
        qr_code: string;
        provisioning_uri: string;
      }>("/accounts/2fa/totp/setup/", {
        method: "POST",
      });
      
      setSetupData(response);
      setShowSetup(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to setup authenticator");
    } finally {
      setSending(false);
    }
  };

  const verifyBackupCode = async () => {
    if (backupCode.trim().length < 4) return;

    try {
      setVerifying(true);
      setError(null);

      const response = await apiFetch<{
        verified: boolean;
        verification_token?: string;
        detail?: string;
      }>("/accounts/2fa/backup-codes/verify/", {
        method: "POST",
        body: JSON.stringify({ code: backupCode.trim() }),
      });

      if (response.verified && response.verification_token) {
        toast.success("Verification successful!");
        onVerified(response.verification_token);
        onOpenChange(false);
      } else {
        setError(response.detail || "Invalid or already used backup code");
        setBackupCode("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setBackupCode("");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm" height="fill">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <span className="block mt-1 text-xs">
                  {remainingAttempts} attempts remaining
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {status?.blocking_reason === "no_2fa_method" && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>
                2FA is required to seal, but no email or authenticator method is
                configured. Set up an authenticator app now, or add an email in
                your profile settings and try again.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveTab("totp");
                  void setupTOTP();
                }}
                disabled={sending}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Set up authenticator
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "email" | "totp" | "backup_code")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="email"
              disabled={!status?.available_methods.includes("email")}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="totp" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger
              value="backup_code"
              disabled={!status?.available_methods.includes("backup_code")}
              className="gap-2"
            >
              <KeyRound className="h-4 w-4" />
              Backup code
            </TabsTrigger>
          </TabsList>

          {/* Email OTP Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            {!otpSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    We'll send a 6-digit code to your email
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status?.email ? `(${status.email})` : "No email configured"}
                  </p>
                </div>
                <Button 
                  onClick={requestEmailOTP} 
                  disabled={sending || !status?.available_methods.includes("email")}
                  className="w-full"
                >
                  {sending ? (
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
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm">Code sent! Check your email.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Enter 6-digit code</Label>
                  <Input
                    ref={emailInputRef}
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleKeyDown(e, verifyEmailOTP)}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    autoComplete="one-time-code"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={requestEmailOTP}
                    disabled={countdown > 0 || sending}
                    className="flex-1"
                  >
                    {countdown > 0 ? (
                      <>Resend in {countdown}s</>
                    ) : sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={verifyEmailOTP}
                    disabled={otpCode.length !== 6 || verifying}
                    className="flex-1"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TOTP Tab */}
          <TabsContent value="totp" className="space-y-4 mt-4">
            {!(status?.totp_confirmed && status?.totp_enabled) && !showSetup ? (
              // Not set up yet
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Use an authenticator app for faster verification
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Google Authenticator, Microsoft Authenticator, etc.
                  </p>
                </div>
                <Button onClick={setupTOTP} disabled={sending} className="w-full">
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Set Up Authenticator
                </Button>
              </div>
            ) : showSetup ? (
              // Setup mode - show QR code
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium mb-3">
                    Scan this QR code with your authenticator app
                  </p>
                  {setupData?.qr_code && (
                    <div className="flex justify-center mb-3">
                      <Image 
                        src={setupData.qr_code} 
                        alt="TOTP QR Code" 
                        width={192}
                        height={192}
                        unoptimized
                        className="w-48 h-48 border rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-2">
                    Or enter this code manually:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="px-3 py-1.5 bg-muted rounded text-sm font-mono">
                      {setupData?.secret}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copySecret}>
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totp-setup-code">
                    Enter code from app to confirm setup
                  </Label>
                  <Input
                    ref={totpInputRef}
                    id="totp-setup-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleKeyDown(e, verifyTOTP)}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetup(false);
                      setSetupData(null);
                      setTotpCode("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={verifyTOTP}
                    disabled={totpCode.length !== 6 || verifying}
                    className="flex-1"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirm Setup"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // TOTP already set up - verify
              <div className="space-y-4">
                <div className="text-center">
                  <Smartphone className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Input
                    ref={totpInputRef}
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleKeyDown(e, verifyTOTP)}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    autoComplete="one-time-code"
                  />
                </div>
                
                <Button
                  onClick={verifyTOTP}
                  disabled={totpCode.length !== 6 || verifying}
                  className="w-full"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="backup_code" className="space-y-4 mt-4">
            <div className="text-center space-y-2">
              <KeyRound className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm">Enter one of your unused backup codes.</p>
              <p className="text-xs text-muted-foreground">
                Each code works once and is replaced when you generate a new set.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backup-code">Backup code</Label>
              <Input
                ref={backupInputRef}
                id="backup-code"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, verifyBackupCode)}
                placeholder="XXXX-XXXX"
                className="text-center text-xl tracking-widest font-mono"
                autoComplete="one-time-code"
              />
            </div>
            <Button
              onClick={verifyBackupCode}
              disabled={backupCode.trim().length < 4 || verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default TwoFactorVerificationModal;

