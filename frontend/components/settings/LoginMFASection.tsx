"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";
import { Loader2, Shield } from "lucide-react";
import Image from "next/image";
import { appType } from "@/lib/app-type";

type LoginMFAStatus = {
  mfa_enabled: boolean;
  mfa_required: boolean;
  totp_confirmed: boolean;
  preferred_method: string;
  available_methods: string[];
};

export function LoginMFASection() {
  const [status, setStatus] = useState<LoginMFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<LoginMFAStatus>("/accounts/auth/login-mfa/status/");
      setStatus(data);
    } catch {
      toast.error("Could not load login MFA settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await apiFetch("/accounts/auth/login-mfa/enable/", { method: "POST" });
      await loadStatus();
      toast.success("Login MFA enabled. Set up an authenticator app below.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to enable MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await apiFetch("/accounts/auth/login-mfa/disable/", { method: "POST" });
      setQrCode(null);
      await loadStatus();
      toast.success("Login MFA disabled.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to disable MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleSetupTotp = async () => {
    setBusy(true);
    try {
      const data = await apiFetch<{ secret: string; qr_code: string }>(
        "/accounts/auth/login-mfa/totp/setup/",
        { method: "POST" }
      );
      setSecret(data.secret);
      setQrCode(data.qr_code);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "TOTP setup failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!verifyCode.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/accounts/auth/login-mfa/totp/verify/", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      setVerifyCode("");
      setQrCode(null);
      await loadStatus();
      toast.success("Authenticator app verified for login.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 py-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className={`${appType.panelTitle} flex items-center gap-2`}>
          <Shield className="h-4 w-4" />
          Login Multi-Factor Authentication
        </h2>
        <p className={appType.caption}>
          Require a verification code after your password when signing in (separate from executive seal 2FA).
        </p>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Login MFA</p>
            <p className="text-sm text-muted-foreground">
              {status?.mfa_required
                ? "Required by your administrator"
                : status?.mfa_enabled
                ? "Enabled on your account"
                : "Disabled"}
            </p>
          </div>
          <Switch
            checked={Boolean(status?.mfa_enabled)}
            disabled={busy || Boolean(status?.mfa_required)}
            onCheckedChange={(checked) => {
              if (checked) void handleEnable();
              else void handleDisable();
            }}
          />
        </div>

        {status?.mfa_enabled && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Authenticator app</p>
            {!status.totp_confirmed ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={handleSetupTotp} disabled={busy}>
                  Set up authenticator
                </Button>
                {qrCode && (
                  <div className="space-y-3">
                    <div className="relative h-40 w-40 mx-auto">
                      <Image src={qrCode} alt="TOTP QR code" fill unoptimized className="object-contain" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground break-all">Secret: {secret}</p>
                    <div className="space-y-2">
                      <Label htmlFor="loginMfaCode">Verification code</Label>
                      <Input
                        id="loginMfaCode"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="6-digit code"
                      />
                      <Button type="button" size="sm" onClick={handleVerifyTotp} disabled={busy}>
                        Confirm authenticator
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Authenticator app is configured for login.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
