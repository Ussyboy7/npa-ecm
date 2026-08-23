"use client";

import { Info, Shield, FileText } from "lucide-react";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { Card, CardContent } from "@/components/ui/card";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { PublicPortalShell } from "@/components/shared/PublicPortalShell";

export default function VerifyPage() {
  return (
    <PublicPortalShell portalSubtitle="Seal Verification">
      <QueuePageShell
        title="Verify Seal"
        subtitle="Confirm document authenticity by checking an executive seal serial number."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">Enter a seal serial number</h2>
                  <p className="text-sm text-muted-foreground">
                    Use the serial printed on the approved document to verify if the seal is valid.
                  </p>
                </div>
              </div>
              <VerifyForm showLabel />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                How it works
              </h3>
              <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                <li>Enter the serial number shown on the sealed document.</li>
                <li>Review the verification status and seal details returned.</li>
                <li>Use the result to validate authenticity before processing.</li>
              </ol>
              <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 text-primary" />
                <p>Example format: NPA-YYYYMMDD-XXXXXXXX.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </QueuePageShell>
    </PublicPortalShell>
  );
}
