"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, Shield, Calendar, User, FileText, Clock, AlertTriangle, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";

interface SealVerification {
  valid: boolean;
  serial_number: string;
  sealed_by: string;
  office_name: string;
  office_title: string;
  sealed_at: string;
  document_title?: string;
  correspondence_subject?: string;
  invalidated_at?: string;
  invalidated_reason?: string;
  error?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const serial = params.serial as string;
  
  const [verification, setVerification] = useState<SealVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifySeal = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/accounts/seal/verify/${serial}/`);
        const data = await response.json();
        
        if (response.ok) {
          setVerification(data);
        } else {
          setError(data.error || "Seal not found");
          setVerification({ valid: false, serial_number: serial } as SealVerification);
        }
      } catch (err) {
        setError("Failed to verify seal. Please try again.");
        setVerification({ valid: false, serial_number: serial } as SealVerification);
      } finally {
        setLoading(false);
      }
    };

    if (serial) {
      verifySeal();
    }
  }, [serial]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-NG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
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
          <div className="flex items-center gap-3">
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
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="text-slate-300 border-slate-600 hover:bg-slate-800">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {loading ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-slate-400">Verifying seal...</p>
                <p className="text-xs text-slate-500 font-mono">{serial}</p>
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
              {/* Serial Number */}
              <div className="text-center py-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Serial Number</p>
                <p className="text-xl font-mono font-bold text-white">{verification.serial_number}</p>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sealed By</p>
                    <p className="text-white font-medium">{verification.sealed_by}</p>
                    <p className="text-sm text-slate-400">{verification.office_title}</p>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Organization</p>
                    <p className="text-white font-medium">{verification.office_name}</p>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Date & Time</p>
                    <p className="text-white font-medium">{formatDate(verification.sealed_at)}</p>
                  </div>
                </div>

                {(verification.document_title || verification.correspondence_subject) && (
                  <>
                    <Separator className="bg-slate-700" />
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Document</p>
                        <p className="text-white font-medium">
                          {verification.document_title || verification.correspondence_subject}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                  This seal was verified on {new Date().toLocaleDateString()}. The authenticity of this document 
                  is confirmed by the Nigerian Ports Authority Electronic Correspondence Management system.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* INVALID SEAL */
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            {/* Error Banner */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                  <XCircle className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {verification?.invalidated_at ? "Invalidated Seal" : "Invalid Seal"}
                  </h2>
                  <p className="text-red-100">
                    {error || "This seal could not be verified"}
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Serial Number */}
              <div className="text-center py-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Serial Number</p>
                <p className="text-xl font-mono font-bold text-white">{serial}</p>
              </div>

              {verification?.invalidated_at && (
                <div className="p-4 bg-red-950/50 rounded-lg border border-red-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">This seal was invalidated</p>
                      <p className="text-xs text-red-300 mt-1">
                        Date: {formatDate(verification.invalidated_at)}
                      </p>
                      {verification.invalidated_reason && (
                        <p className="text-xs text-red-300 mt-1">
                          Reason: {verification.invalidated_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="p-4 bg-amber-950/50 rounded-lg border border-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Warning</p>
                    <p className="text-xs text-amber-200 mt-1">
                      This document may be fraudulent or the seal may have been tampered with. 
                      Please contact the Nigerian Ports Authority to verify the authenticity of this document.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="text-center pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  For inquiries, contact NPA at{" "}
                  <a href="mailto:info@nigerianports.gov.ng" className="text-primary hover:underline">
                    info@nigerianports.gov.ng
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verify Another */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm mb-4">Need to verify another seal?</p>
          <VerifyForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Nigerian Ports Authority. All rights reserved.
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
      <input
        type="text"
        value={serialInput}
        onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
        placeholder="Enter serial number (e.g., NPA-20241201-A8F3B2C1)"
        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-sm font-mono"
        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
      />
      <Button onClick={handleVerify} disabled={!serialInput.trim()}>
        Verify
      </Button>
    </div>
  );
}


