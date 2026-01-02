"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
<<<<<<< HEAD
import { Shield, Home, Info, CheckCircle2, AlertTriangle, QrCode, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { QRCodeScanner } from "@/components/verify/QRCodeScanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";

export default function VerifyPage() {
  const router = useRouter();
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleVerify = (serial: string) => {
    router.push(`/verify/${serial}`);
  };

  const handleQRScan = (serial: string) => {
    setShowQRScanner(false);
    handleVerify(serial);
=======
import { Shield, Home, Search, Info, CheckCircle2, AlertTriangle, QrCode, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NPA_LOGO_URL, NPA_BRAND_NAME } from "@/lib/branding";

export default function VerifyPage() {
  const router = useRouter();
  const [serialInput, setSerialInput] = useState("");

  const handleVerify = () => {
    if (serialInput.trim()) {
      router.push(`/verify/${serialInput.trim()}`);
    }
>>>>>>> 5d0c0e6dcd2e46c27b6252c65a1fe1c3a13a9245
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
      <main className="container mx-auto px-4 py-12 max-w-4xl">
<<<<<<< HEAD
        <HelpGuideCard
          title="Digital Executive Seal Verification"
          description="Verify the authenticity of digitally approved documents using their unique serial number. Each seal contains encrypted information that confirms the document's approval status, timestamp, and authorized signatory."
          links={[
            { label: 'View All Documents', href: '/search' },
            { label: 'Executive Approvals', href: '/approvals' }
          ]}
          dismissible
          dismissKey="verify-seal-guide"
          className="mb-6"
        />

=======
>>>>>>> 5d0c0e6dcd2e46c27b6252c65a1fe1c3a13a9245
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Verification Card */}
          <div className="md:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-4">
<<<<<<< HEAD
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-20 w-20 rounded-full bg-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-600/10">
                        <Shield className="h-10 w-10 text-emerald-500" />
                      </div>
                      <ContextualHelp
                        title="About Seal Verification"
                        description="Digital Executive Seals provide cryptographic proof of document authenticity. Each seal is unique and cannot be forged."
                        steps={[
                          'Enter the serial number from the document',
                          'Or scan the QR code for quick verification',
                          'View detailed seal information and verification status',
                          'Download certificate for official records'
                        ]}
                        placement={{ align: 'end', side: 'bottom' }}
                        className="text-slate-400"
                      />
=======
                    <div className="flex justify-center">
                      <div className="h-20 w-20 rounded-full bg-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-600/10">
                        <Shield className="h-10 w-10 text-emerald-500" />
                      </div>
>>>>>>> 5d0c0e6dcd2e46c27b6252c65a1fe1c3a13a9245
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Verify Digital Executive Seal</h2>
                      <p className="text-slate-400 text-lg">
                        Verify the authenticity of digitally approved documents
                      </p>
                    </div>
                  </div>

                  {/* Verification Form */}
                  <div className="space-y-4">
<<<<<<< HEAD
                    <VerifyForm onVerify={handleVerify} />
                    
                    {/* QR Code Scanner Button */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-700" />
                      <span className="text-xs text-slate-500 px-2">OR</span>
                      <div className="flex-1 h-px bg-slate-700" />
                    </div>
                    
                    <Button 
                      onClick={() => setShowQRScanner(true)}
                      variant="outline"
                      className="w-full h-12 text-base border-slate-600 hover:bg-slate-700"
                      size="lg"
                      aria-label="Scan QR code"
                    >
                      <QrCode className="h-5 w-5 mr-2" />
                      Scan QR Code
=======
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Serial Number
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          value={serialInput}
                          onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                          placeholder="NPA-20241201-A8F3B2C1"
                          className="pl-10 h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 font-mono text-base"
                          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Format: NPA-YYYYMMDD-XXXXXXXX
                      </p>
                    </div>
                    <Button 
                      onClick={handleVerify} 
                      disabled={!serialInput.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                      size="lg"
                    >
                      <Shield className="h-5 w-5 mr-2" />
                      Verify Seal
>>>>>>> 5d0c0e6dcd2e46c27b6252c65a1fe1c3a13a9245
                    </Button>
                  </div>

                  {/* Quick Info */}
                  <div className="pt-6 border-t border-slate-700">
                    <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg">
                      <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-slate-400">
                        <p className="font-medium text-slate-300 mb-1">About Digital Executive Seals</p>
                        <p>
                          Digital executive seals certify that documents have been digitally approved by authorized executives 
                          of the Nigerian Ports Authority. Each seal has a unique serial number that can be verified for authenticity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* How It Works */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  How It Works
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 text-xs font-bold">1</span>
                    </div>
                    <p>Enter the seal serial number from the document</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 text-xs font-bold">2</span>
                    </div>
                    <p>Our system verifies the seal against our database</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-500 text-xs font-bold">3</span>
                    </div>
                    <p>View detailed verification results and seal information</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Verification Features
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <QrCode className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>QR Code scanning support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Real-time authenticity check</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FileText className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>Complete seal details</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>Invalid seal detection</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example Serial */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Example Serial Number</h3>
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <code className="text-xs font-mono text-emerald-400 block text-center">
                    NPA-20251203-5D2CEB42
                  </code>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Serial numbers are typically found at the bottom of sealed documents
                </p>
              </CardContent>
            </Card>
          </div>
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
<<<<<<< HEAD

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onScan={handleQRScan}
      />
=======
>>>>>>> 5d0c0e6dcd2e46c27b6252c65a1fe1c3a13a9245
    </div>
  );
}

