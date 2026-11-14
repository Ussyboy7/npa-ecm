"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import { validatePassword } from "@/app/settings/settings-utils";
import { getBaseUrl } from "@/lib/api-client";
import { NPA_BRAND_NAME, NPA_LOGO_URL } from "@/lib/branding";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams?.get("uid") || "";
  const token = searchParams?.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !uid || !token;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${getBaseUrl()}/accounts/auth/initial-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            token,
            new_password: password,
            confirm_password: confirmPassword,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        new_password?: string | string[];
      };
      if (!response.ok) {
        const passwordMessage = Array.isArray(payload.new_password)
          ? payload.new_password[0]
          : payload.new_password;
        throw new Error(
          passwordMessage ||
            payload.detail ||
            "Could not set your password. The link may have expired.",
        );
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not set your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-6 py-10">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border bg-white">
            <Image
              src={NPA_LOGO_URL}
              alt={`${NPA_BRAND_NAME} crest`}
              fill
              unoptimized
              sizes="48px"
              className="object-contain p-1"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">
              {done ? "Password set" : "Set your NPA ECM password"}
            </CardTitle>
            <CardDescription>
              {done
                ? "Your account is ready. Sign in with your new password."
                : "Choose a password for your first sign-in. This link can only be used once."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {done ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Your password was saved successfully.</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Continue to sign in</Link>
              </Button>
            </div>
          ) : invalidLink ? (
            <div className="space-y-5">
              <p className="text-sm text-destructive" role="alert">
                This setup link is incomplete or invalid. Ask your ECM administrator
                for a new first-login link.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a strong password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Use at least 8 characters with uppercase, lowercase, and a number.
              </p>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving password…" : "Set password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback />}>
      <SetPasswordForm />
    </Suspense>
  );
}
