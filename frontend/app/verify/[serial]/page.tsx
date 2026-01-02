"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useSealVerification } from "@/hooks/use-seal-verification";
import { SealVerificationResult } from "@/components/verify/SealVerificationResult";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { SealVerificationErrorBoundary } from "@/components/verify/ErrorBoundary";
import { validateSerialNumber } from "@/lib/api/seal-verification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function VerifySerialPage() {
  const params = useParams();
  const router = useRouter();
  const rawSerial = params.serial as string;
  // Decode serial number from URL (in case it was encoded)
  const serial = rawSerial ? decodeURIComponent(rawSerial) : '';
  const [mounted, setMounted] = useState(false);
  
  const { verification, loading, error, retry, reset } = useSealVerification({
    serial: mounted && serial ? serial : undefined, // Only pass serial after mount
    autoVerify: true,
    retryCount: 3,
    retryDelay: 1000,
  });

  // Track when component has mounted on client to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate serial number format on mount
  useEffect(() => {
    if (serial && mounted) {
      const validation = validateSerialNumber(serial);
      if (!validation.valid) {
        // Invalid format - could redirect or show error
        // For now, let the API handle it
      }
    }
  }, [serial, mounted]);

  const handleVerifyAnother = () => {
    reset();
    router.push('/verify');
  };

  return (
    <SealVerificationErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link 
              href="/verify" 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              aria-label="Back to verification page"
            >
              <Image
                src={NPA_LOGO_URL}
                alt={NPA_BRAND_NAME}
                width={40}
                height={40}
                className="rounded"
              />
              <div>
                <h1 className="text-lg font-bold text-white">NPA ECM</h1>
                <p className="text-xs text-slate-400">Seal Verification</p>
              </div>
            </Link>
            <Link href="/verify">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-slate-300 border-slate-600 hover:bg-slate-800"
                aria-label="Back to verify page"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Verify
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          {loading ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="animate-spin h-16 w-16 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-slate-300 font-medium">Verifying seal...</p>
                    <p className="text-xs text-slate-500 font-mono bg-slate-900/50 px-3 py-1.5 rounded inline-block">
                      {serial}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">Please wait while we verify the authenticity</p>
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-6 text-center">
                  <Shield className="h-16 w-16 text-slate-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Verification Failed</h3>
                    <div className="space-y-3 mb-6">
                      <p className="text-sm text-slate-400">
                        {error || 'Unable to verify seal. Please try again.'}
                      </p>
                      {serial && (
                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                          <p className="text-xs text-slate-500 mb-1">Serial Number:</p>
                          <p className="text-sm font-mono text-slate-300">{serial}</p>
                        </div>
                      )}
                      <div className="text-xs text-slate-500 space-y-1">
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

          {/* Verify Another - Enhanced */}
          {verification && (
            <Card className="mt-8 bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-slate-300 font-medium mb-1">Need to verify another seal?</p>
                    <p className="text-xs text-slate-500">Enter a different serial number to verify</p>
                  </div>
                  <VerifyForm 
                    onVerify={(serial) => router.push(`/verify/${serial}`)}
                    compact={true}
                    showLabel={false}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-16 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-sm">
              © {mounted ? new Date().getFullYear() : '2025'} Nigerian Ports Authority. All rights reserved.
            </p>
            <p className="text-slate-600 text-xs mt-2">
              Electronic Correspondence Management System
            </p>
          </div>
        </footer>
      </div>
    </SealVerificationErrorBoundary>
  );
}
