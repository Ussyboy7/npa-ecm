"use client";
import { logError } from '@/lib/client-logger';
import { useEffect, useRef, useState, Suspense } from "react";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NPA_LOGO_URL, NPA_BRAND_NAME, NPA_ECM_CONTACT_EMAIL } from "@/lib/branding";
import { login, isMfaChallenge, verifyLoginMFA, requestLoginMFAEmail, getOidcLoginUrl, fetchOidcStatus, restoreAuthCookies } from "@/lib/api-client";
import { getStoredRedirectPath } from "@/lib/auth-errors";
import { resolveRedirectPath } from "@/lib/auth-redirect";

const REMEMBERED_USERNAME_KEY = "npa_ecm_remember_me";

function readRememberedUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(REMEMBERED_USERNAME_KEY) || "null");
    const username = (parsed as { username?: unknown } | null)?.username;
    return typeof username === "string" ? username : "";
  } catch {
    return "";
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaMethods, setMfaMethods] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMethod, setMfaMethod] = useState<"email" | "totp" | "backup_code">("email");
  const [mfaEmailSent, setMfaEmailSent] = useState(false);
  const [mfaEmailSending, setMfaEmailSending] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const resumedRef = useRef(false);
  const ssoErrorHandledRef = useRef(false);

  // Show the SSO failure once, then drop it from the address bar so a reload or
  // a shared link cannot replay it.
  useEffect(() => {
    if (ssoErrorHandledRef.current || !searchParams?.has("sso_error")) return;
    ssoErrorHandledRef.current = true;
    const error = searchParams.get("sso_error");
    if (error) setSsoError(error);
    const url = new URL(window.location.href);
    url.searchParams.delete("sso_error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchParams]);

  useEffect(() => {
    const remembered = readRememberedUsername();
    if (!remembered) return;
    setUsername((current) => current || remembered);
    setRememberMe(true);
  }, []);

  // The proxy gates routes on the auth cookie, which can lapse while the
  // session itself is still valid in storage. When it bounced us here with a
  // ?redirect= target, restore the cookie and continue instead of asking the
  // user to sign in again.
  useEffect(() => {
    const target = searchParams?.get('redirect');
    if (!target || resumedRef.current) return;
    resumedRef.current = true;
    void restoreAuthCookies().then((ok) => {
      if (ok) window.location.replace(resolveRedirectPath(target));
    });
  }, [searchParams]);

  useEffect(() => {
    void fetchOidcStatus()
      .then((data) => setOidcEnabled(Boolean(data.enabled)))
      .catch(() => setOidcEnabled(false));
  }, []);

  const completeSignIn = (signedInUsername: string) => {
    if (rememberMe && signedInUsername) {
      window.localStorage.setItem(REMEMBERED_USERNAME_KEY, JSON.stringify({ username: signedInUsername }));
    } else {
      window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }
    toast.success("Signed in successfully");
    // Full navigation so the server-owned session cookies apply to the next page.
    const requested = searchParams?.get("redirect") || getStoredRedirectPath();
    window.location.assign(resolveRedirectPath(requested));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const identifier = username.trim();
    if (!identifier || !password) {
      toast.error("Enter your username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(identifier, password);

      if (isMfaChallenge(result)) {
        setMfaChallengeId(result.challenge_id);
        setMfaMethods(result.methods);
        setMfaCode("");
        setMfaEmailSent(false);
        setMfaMethod(
          result.methods.includes("totp")
            ? "totp"
            : result.methods.includes("email")
            ? "email"
            : "backup_code",
        );
        toast.message("Enter your verification code to complete sign-in.");
        return;
      }

      completeSignIn(identifier);
    } catch (error: unknown) {
      logError(error);
      // A failed sign-in attempt sets no cookies either way, so the existing
      // session is left untouched for a user who already has one.
      toast.error(
        error instanceof Error ? error.message : "Unable to sign in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaChallengeId || !mfaCode.trim()) {
      toast.error("Enter your verification code.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyLoginMFA(mfaChallengeId, mfaCode.trim(), mfaMethod);
      completeSignIn(username.trim());
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Invalid verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestMfaEmail = async () => {
    if (!mfaChallengeId || mfaEmailSending) return;
    setMfaEmailSending(true);
    try {
      await requestLoginMFAEmail(mfaChallengeId);
      setMfaEmailSent(true);
      toast.success("Verification code sent to your email.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not send email code.");
    } finally {
      setMfaEmailSending(false);
    }
  };

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:min-h-screen lg:grid-cols-[1.2fr,1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-emerald-100/30 p-12 text-foreground dark:from-primary/20 dark:via-slate-900 dark:to-slate-950 dark:text-primary-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/30 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14" aria-label={`${NPA_BRAND_NAME} logo`}>
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              unoptimized
              sizes="56px"
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary dark:text-primary-foreground/90">
              {NPA_BRAND_NAME}
            </p>
            <h1 className="text-2xl font-semibold text-foreground dark:text-primary-foreground">
              Enterprise Content Management
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 dark:bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary dark:text-white/90">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Secure Workflow Hub
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold leading-tight text-foreground dark:text-white">
              Accountability for leadership. Clarity for officers. Institutional memory for the Authority.
            </h2>
            <p className="text-base text-muted-foreground dark:text-white/80">
              Office-owned correspondence, decisions, forms, and executive approvals, with immediate access to institutional memory across NPA&apos;s structure.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground dark:text-white/85">
          <p>
            Contact Programme Office:{" "}
            <a className="underline text-primary hover:opacity-80 dark:hover:text-white" href={`mailto:${NPA_ECM_CONTACT_EMAIL}`}>
              {NPA_ECM_CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-muted-foreground/70 dark:text-white/60">© {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.</p>
        </div>
      </div>

      <div className="flex min-h-dvh items-start justify-center px-6 py-8 sm:px-8 sm:py-12 lg:min-h-0 lg:items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to landing
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-white" aria-label={`${NPA_BRAND_NAME} logo`}>
                <Image
                  src={NPA_LOGO_URL}
                  alt={`${NPA_BRAND_NAME} crest`}
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Sign in to NPA ECM</CardTitle>
              <CardDescription>
                Sign in with your official NPA ECM credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ssoError && (
                <p className="mb-4 text-sm text-destructive" role="alert">
                  Single sign-on failed: {ssoError}. Use your ECM credentials below or contact ICT.
                </p>
              )}
              {mfaChallengeId ? (
                <form className="space-y-5" onSubmit={handleMfaSubmit}>
                  <p className="text-sm text-muted-foreground">
                    Multi-factor authentication is required. Enter the code from your authenticator app or email.
                  </p>
                  {mfaMethods.length > 1 && (
                    <div className="space-y-2">
                      <Label>Verification method</Label>
                      <Select
                        value={mfaMethod}
                        onValueChange={(v) =>
                          setMfaMethod(v as "email" | "totp" | "backup_code")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mfaMethods.includes("email") && <SelectItem value="email">Email code</SelectItem>}
                          {mfaMethods.includes("totp") && <SelectItem value="totp">Authenticator app</SelectItem>}
                          {mfaMethods.includes("backup_code") && (
                            <SelectItem value="backup_code">Backup code</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">Verification code</Label>
                    <Input
                      id="mfaCode"
                      inputMode={mfaMethod === "backup_code" ? "text" : "numeric"}
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder={mfaMethod === "backup_code" ? "XXXX-XXXX" : "6-digit code"}
                    />
                  </div>
                  {mfaMethod === "email" && mfaMethods.includes("email") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleRequestMfaEmail}
                      disabled={mfaEmailSending}
                    >
                      {mfaEmailSending
                        ? "Sending…"
                        : mfaEmailSent
                        ? "Resend email code"
                        : "Send code to my email"}
                    </Button>
                  )}
                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? "Verifying…" : "Verify and sign in"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setMfaChallengeId(null);
                      setMfaCode("");
                      setMfaEmailSent(false);
                      setMfaMethods([]);
                    }}
                  >
                    Back to sign in
                  </Button>
                </form>
              ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(value) => setRememberMe(Boolean(value))}
                    />
                    Remember username
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {oidcEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      window.location.href = getOidcLoginUrl();
                    }}
                  >
                    Sign in with NPA Active Directory
                  </Button>
                ) : null}
              </form>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Need an account? Contact the registry or programme office to request access.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              To reset your password, please contact the ECM Programme Office. They will assist you with password recovery and account access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Contact Information:</p>
              <p className="text-sm text-muted-foreground">
                Email:{" "}
                <a
                  href={`mailto:${NPA_ECM_CONTACT_EMAIL}?subject=Password Reset Request&body=Please assist with resetting my ECM account password.`}
                  className="text-primary hover:underline"
                >
                  {NPA_ECM_CONTACT_EMAIL}
                </a>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForgotPassword(false)}>
                Close
              </Button>
              <Button asChild>
                <a href={`mailto:${NPA_ECM_CONTACT_EMAIL}?subject=Password Reset Request&body=Please assist with resetting my ECM account password.`}>
                  Send Email
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback fullScreen message="Loading..." />}>
      <LoginForm />
    </Suspense>
  );
}
