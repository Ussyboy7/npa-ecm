"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DigitalSealPreview } from "@/components/seals/DigitalSealPreview";

const OFFICE_SEALS = [
  {
    id: "md",
    name: "Managing Director",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "OFFICE OF THE MANAGING DIRECTOR",
    serialPrefix: "NPA-MD",
  },
  {
    id: "ed-ets",
    name: "ED Engineering & Technical",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "ED, ENGINEERING & TECHNICAL SERVICES",
    serialPrefix: "NPA-ED-ETS",
  },
  {
    id: "ed-fa",
    name: "ED Finance & Administration",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "ED, FINANCE & ADMINISTRATION",
    serialPrefix: "NPA-ED-FA",
  },
  {
    id: "ed-mo",
    name: "ED Marine & Operations",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "ED, MARINE & OPERATIONS",
    serialPrefix: "NPA-ED-MO",
  },
  {
    id: "gm-ppp",
    name: "GM Public-Private Partnership",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "GM, PUBLIC-PRIVATE PARTNERSHIP",
    serialPrefix: "NPA-GM-PPP",
  },
  {
    id: "gm-proc",
    name: "GM Procurement",
    officeName: "NIGERIAN PORTS AUTHORITY",
    officeTitle: "GM, PROCUREMENT",
    serialPrefix: "NPA-GM-PROC",
  },
];

export default function SealPreviewPage() {
  const [selectedOffice, setSelectedOffice] = useState(OFFICE_SEALS[0]);
  const [sealSize, setSealSize] = useState(350);

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Digital Executive Approval Seal</h1>
          <p className="text-muted-foreground">
            Preview of office-based seal templates for NPA ECM
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seal Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Seal Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <DigitalSealPreview
                officeName={selectedOffice.officeName}
                officeTitle={selectedOffice.officeTitle}
                serialPrefix={selectedOffice.serialPrefix}
                signatureText="Signature"
                size={sealSize}
                showQR={true}
              />

              {/* Size controls */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Size:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSealSize(250)}
                  className={sealSize === 250 ? "bg-primary text-primary-foreground" : ""}
                >
                  Small
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSealSize(350)}
                  className={sealSize === 350 ? "bg-primary text-primary-foreground" : ""}
                >
                  Medium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSealSize(450)}
                  className={sealSize === 450 ? "bg-primary text-primary-foreground" : ""}
                >
                  Large
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Office Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Office</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {OFFICE_SEALS.map((office) => (
                  <Button
                    key={office.id}
                    variant={selectedOffice.id === office.id ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedOffice(office)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{office.name}</div>
                      <div className="text-xs opacity-70">{office.serialPrefix}-XXXXXXXXX</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How Digital Seals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold">Office Template</h3>
                <p className="text-sm text-muted-foreground">
                  Each office has a pre-designed seal template (fixed branding)
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold">Upload Signature</h3>
                <p className="text-sm text-muted-foreground">
                  Executive uploads their signature in Settings (encrypted storage)
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold">Apply Seal</h3>
                <p className="text-sm text-muted-foreground">
                  System combines template + signature + serial + QR automatically
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-primary">4</span>
                </div>
                <h3 className="font-semibold">Verify Anytime</h3>
                <p className="text-sm text-muted-foreground">
                  Scan QR to verify authenticity on public verification page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> This is a preview. The actual NPA logo will replace the placeholder.
            Signatures will be overlaid dynamically when executives approve documents.
          </p>
        </div>
      </div>
    </div>
  );
}

