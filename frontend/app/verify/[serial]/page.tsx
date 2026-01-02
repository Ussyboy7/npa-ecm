"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, Shield, Calendar, User, FileText, Clock, AlertTriangle, ExternalLink, Eye, ArrowLeft } from "lucide-react";
import { DigitalSealPreview } from "@/components/seals/DigitalSealPreview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { useSealVerification } from "@/hooks/use-seal-verification";
import { SealVerificationResult } from "@/components/verify/SealVerificationResult";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { SealVerificationErrorBoundary } from "@/components/verify/ErrorBoundary";
import { validateSerialNumber } from "@/lib/api/seal-verification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SealVerification {
  valid: boolean;
  serial_number: string;
  sealed_by: string;
  office_name: string;
  office_title: string;
  sealed_at: string;
  document_title?: string;
  document_id?: string;
  correspondence_subject?: string;
  correspondence_id?: string;
  invalidated_at?: string;
  invalidated_reason?: string;
  error?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const rawSerial = params.serial as string;
  // Decode serial number from URL (in case it was encoded)
  const serial = rawSerial ? decodeURIComponent(rawSerial) : '';
  const [mounted, setMounted] = useState(false);
  
  const [verification, setVerification] = useState<SealVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Track when component has mounted on client to avoid hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track when component has mounted on client to avoid hydration mismatches
  useEffect(() => {
    // Prevent duplicate fetches in React StrictMode (development)
    if (hasFetched || !serial) return;
    
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const verifySeal = async () => {
      try {
        setLoading(true);
        setHasFetched(true);
        
        // Get API base URL - works across local/stag/prod environments
        // NEXT_PUBLIC_API_URL is typically "http://localhost:8002/api" (without /v1)
        let apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';
        
        // Normalize: remove trailing slashes
        apiBase = apiBase.replace(/\/+$/, '');
        
        // Ensure we have /api/v1 in the URL
        // If it ends with /api/v1, use as-is
        // If it ends with /api, add /v1
        // Otherwise, add /api/v1
        let baseUrl: string;
        if (apiBase.endsWith('/api/v1')) {
          baseUrl = apiBase;
        } else if (apiBase.endsWith('/api')) {
          baseUrl = `${apiBase}/v1`;
        } else {
          // Just the host (e.g., http://localhost:8002), add /api/v1
          baseUrl = `${apiBase}/api/v1`;
        }
        
        const verifyUrl = `${baseUrl}/accounts/seal/verify/${serial}/`;
        
        console.log('[Seal Verification] Fetching from:', verifyUrl);
        console.log('[Seal Verification] About to call fetch...');
        
        // Use Promise.race with timeout - don't use AbortController signal
        // to avoid issues with React StrictMode unmounting/remounting
        const fetchPromise = fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors', // Explicitly set CORS mode
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timed out after 10 seconds'));
          }, 10000);
        });
        
        let response: Response;
        try {
          console.log('[Seal Verification] Calling fetch now...');
          response = await Promise.race([fetchPromise, timeoutPromise]);
          console.log('[Seal Verification] Fetch promise resolved!');
        } catch (fetchError: any) {
          console.error('[Seal Verification] Fetch exception caught:', fetchError);
          // If component unmounted (React StrictMode), just return silently
          if (!isMounted) {
            console.log('[Seal Verification] Component unmounted, ignoring error');
            return;
          }
          // For timeout or other errors, show error message
          throw fetchError;
        }
        
        console.log('[Seal Verification] Response received:', response.status, response.statusText);
        console.log('[Seal Verification] Response ok:', response.ok);
        console.log('[Seal Verification] Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Parse response - API returns JSON even for 404 errors
        // Read as text first, then parse JSON (can only read body once)
        let responseText: string;
        try {
          responseText = await response.text();
          console.log('[Seal Verification] Response text:', responseText);
        } catch (textError) {
          console.error('[Seal Verification] Failed to read response text:', textError);
          // If we can't read the body, create error response
          const errorData: SealVerification = { 
            valid: false, 
            serial_number: serial,
            sealed_by: '',
            office_name: '',
            office_title: '',
            sealed_at: new Date().toISOString(),
            error: `Failed to read response: ${response.status} ${response.statusText}` 
          };
          setVerification(errorData);
          setError(errorData.error || null);
          setLoading(false);
          return;
        }
        
        let data: SealVerification;
        try {
          data = JSON.parse(responseText);
          console.log('[Seal Verification] Parsed data:', data);
        } catch (parseError) {
          console.error('[Seal Verification] JSON parse error:', parseError, 'Response text:', responseText);
          // If JSON parsing fails, create error response
          data = { 
            valid: false, 
            serial_number: serial,
            sealed_by: '',
            office_name: '',
            office_title: '',
            sealed_at: new Date().toISOString(),
            error: responseText || `HTTP ${response.status} ${response.statusText}` 
          } as SealVerification;
        }
        
        // Handle 404 or invalid seal - API returns valid:false in JSON
        if (!response.ok || !data.valid) {
          console.log('[Seal Verification] Seal not found or invalid, response.ok:', response.ok, 'data.valid:', data.valid);
          // Ensure we have the serial number even if API didn't return it
          if (!data.serial_number) {
            data.serial_number = serial;
          }
          // Always set state, even if component appears unmounted (React StrictMode)
          console.log('[Seal Verification] Setting invalid seal state:', data);
          setVerification(data);
          setError(data.error || "Seal not found");
          setLoading(false);
          console.log('[Seal Verification] Invalid seal state set, loading:', false);
          return;
        }
        
        // Valid seal - set the verification data
        console.log('[Seal Verification] Valid seal found');
        setVerification(data);
        setLoading(false);
        console.log('[Seal Verification] State updated successfully');
      } catch (err) {
        console.error('[Seal Verification] Fetch error:', err);
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : "Failed to verify seal. Please try again.";
        setError(errorMessage);
        setVerification({ valid: false, serial_number: serial } as SealVerification);
        setLoading(false);
      }
    };

    verifySeal();
    
    return () => {
      isMounted = false;
      // Don't abort fetch - let it complete naturally
      // React StrictMode will unmount/remount, but we handle that with isMounted check
    };
  }, [serial, hasFetched]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Format: "3 Dec 2025, 17:58"
      return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/verify" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
            <Button variant="outline" size="sm" className="text-slate-300 border-slate-600 hover:bg-slate-800">
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
        ) : verification?.valid ? (
          /* VALID SEAL */
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Valid Seal</h2>
                  <p className="text-emerald-100">This document has been digitally approved</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Digital Seal Preview */}
              <div className="flex justify-center py-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-lg border border-slate-700">
                <DigitalSealPreview
                  officeName={verification.office_name}
                  officeTitle={verification.office_title}
                  serialNumber={verification.serial_number}
                  timestamp={verification.sealed_at}
                  size={220}
                  showQR={true}
                  verificationBaseUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
                />
              </div>

              {/* Serial Number - Enhanced */}
              <div className="text-center py-5 bg-gradient-to-r from-emerald-950/30 to-emerald-900/20 rounded-lg border border-emerald-800/30">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold">Serial Number</p>
                <p className="text-2xl font-mono font-bold text-white tracking-wider">{verification.serial_number}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/50">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>

              {/* Details - Enhanced Grid Layout */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Sealed By</p>
                      <p className="text-white font-semibold text-sm">{verification.sealed_by}</p>
                      <p className="text-xs text-slate-400 mt-1">{verification.office_title}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Organization</p>
                      <p className="text-white font-semibold text-sm">{verification.office_name}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Date & Time</p>
                      <p className="text-white font-semibold text-sm">{formatDate(verification.sealed_at)}</p>
                    </div>
                  </div>
                </div>

                {(verification.document_title || verification.correspondence_subject) && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 mb-1">Document</p>
                        <p className="text-white font-semibold text-sm break-words mb-2">
                          {verification.document_title || verification.correspondence_subject}
                        </p>
                        <div className="flex gap-2">
                          {verification.document_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
                              onClick={() => window.open(`/dms/${verification.document_id}`, '_blank')}
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

              {/* Footer - Enhanced */}
              <div className="pt-6 border-t border-slate-700">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 rounded-full border border-emerald-800/50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">Verified & Authentic</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-400">
                      {mounted && `Verified on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md">
                      The authenticity of this document is confirmed by the Nigerian Ports Authority 
                      Electronic Correspondence Management system.
                    </p>
                  </div>
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
        <Card className="mt-8 bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div>
                <p className="text-slate-300 font-medium mb-1">Need to verify another seal?</p>
                <p className="text-xs text-slate-500">Enter a different serial number to verify</p>
              </div>
              <VerifyForm />
            </div>
          </CardContent>
        </Card>
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
  );
}

// Mini form for manual verification
function VerifyForm() {
  const [serialInput, setSerialInput] = useState("");

  const handleVerify = () => {
    if (serialInput.trim()) {
      window.location.href = `/verify/${serialInput.trim()}`;
    }
  };

  return (
    <div className="flex gap-2 max-w-md mx-auto">
      <div className="relative flex-1">
        <input
          type="text"
          value={serialInput}
          onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
          placeholder="NPA-20241201-A8F3B2C1"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
      </div>
      <Button 
        onClick={handleVerify} 
        disabled={!serialInput.trim()}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Shield className="h-4 w-4 mr-2" />
        Verify
      </Button>
    </div>
  );
}
