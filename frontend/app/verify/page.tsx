"use client";

import { Info, Shield, FileText } from "lucide-react";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { Card, CardContent } from "@/components/ui/card";
import { QueuePageShell } from "@/components/shared/QueuePageShell";

export default function VerifyPage() {
  return (
    <QueuePageShell
      title="Verify Seal"
      subtitle="Confirm document authenticity by checking an executive seal serial number."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
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
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              How it works
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
              <li>Enter the serial number shown on the sealed document.</li>
              <li>Review the verification status and seal details returned.</li>
              <li>Use the result to validate authenticity before processing.</li>
            </ol>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              <p>Example format: NPA-YYYYMMDD-XXXXXXXX.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </QueuePageShell>
  );
}

