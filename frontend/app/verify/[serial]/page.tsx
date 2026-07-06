"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SealVerificationResult } from "@/components/verify/SealVerificationResult";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { verifySeal, type SealVerification } from "@/lib/api/seal-verification";

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const rawSerial = params.serial as string;
  // Decode serial number from URL (in case it was encoded)
  const serial = rawSerial ? decodeURIComponent(rawSerial) : '';
  
  const [verification, setVerification] = useState<SealVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const retry = () => {
    setVerification(null);
    setError(null);
    setRetryTick((prev) => prev + 1);
  };

  const handleVerifyAnother = () => {
    router.push('/verify');
  };

  useEffect(() => {
    if (!serial) {
      setLoading(false);
      setVerification(null);
      setError("Invalid serial number.");
      return;
    }

    const controller = new AbortController();
    const loadVerification = async () => {
      try {
        setLoading(true);
        const data = await verifySeal(serial, controller.signal);
        if (!data.serial_number) {
          data.serial_number = serial;
        }
        setVerification(data);
        setError(data.valid ? null : data.error || "Seal not found");
      } catch (err) {
        if (controller.signal.aborted) return;
        const errorMessage = err instanceof Error ? err.message : "Failed to verify seal. Please try again.";
        setError(errorMessage);
        setVerification({ valid: false, serial_number: serial, error: errorMessage } as SealVerification);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadVerification();
    
    return () => {
      controller.abort();
    };
  }, [serial, retryTick]);

  return (
    <QueuePageShell
      title="Verify Seal"
      subtitle={`Verification result for ${serial}`}
      actions={
        <Button variant="outline" size="sm" onClick={handleVerifyAnother}>
          Verify Another
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        {loading ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="animate-spin h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Verifying seal...</p>
                  <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded inline-block">
                    {serial}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">Please wait while we verify authenticity.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : verification && verification.serial_number ? (
          // Show verification result if we have verification data (valid or invalid)
          <SealVerificationResult
            verification={verification}
            serial={serial}
            onRetry={retry}
            onVerifyAnother={handleVerifyAnother}
          />
        ) : error && !verification ? (
          // Show error state only if we have an error and no verification data (network error after retries)
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-6 text-center">
                <Shield className="h-16 w-16 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Verification Failed</h3>
                  <div className="space-y-3 mb-6">
                    <p className="text-sm text-muted-foreground">
                      {error || 'Unable to verify seal. Please try again.'}
                    </p>
                    {serial && (
                      <div className="p-3 bg-muted rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Serial Number:</p>
                        <p className="text-sm font-mono">{serial}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Possible reasons:</p>
                      <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                        <li>Serial number format is incorrect</li>
                        <li>Seal does not exist in the system</li>
                        <li>Network connection issue</li>
                        <li>Server is temporarily unavailable</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={retry} variant="outline" disabled={loading}>
                      {loading ? 'Retrying...' : 'Retry'}
                    </Button>
                    <Button onClick={handleVerifyAnother} variant="default">
                      Verify Another
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div>
                <p className="font-medium mb-1">Need to verify another seal?</p>
                <p className="text-xs text-muted-foreground">Enter a different serial number to verify.</p>
              </div>
              <VerifyForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </QueuePageShell>
  );
}

