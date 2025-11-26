"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, PenTool, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { getSignatures, getSignatureWorkflows } from "@/lib/api/forms";
import { FormSignatureDialog } from "./FormSignatureDialog";
import { toast } from "sonner";
import type { FormSignature, FormSignatureWorkflow } from "@/lib/types/forms";
import { formatDateTime } from "@/lib/correspondence-helpers";

export function PendingSignaturesCard() {
  const [pendingSignatures, setPendingSignatures] = useState<FormSignature[]>([]);
  const [workflows, setWorkflows] = useState<FormSignatureWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignature, setSelectedSignature] = useState<{
    signature: FormSignature;
    workflow: FormSignatureWorkflow;
  } | null>(null);

  useEffect(() => {
    loadPendingSignatures();
  }, []);

  const loadPendingSignatures = async () => {
    try {
      setLoading(true);
      const [signaturesData, workflowsData] = await Promise.all([
        getSignatures({ status: "pending" }),
        getSignatureWorkflows({ status: "in_progress" }),
      ]);

      setPendingSignatures(signaturesData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error("Error loading pending signatures:", error);
      toast.error("Failed to load pending signatures");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = (signature: FormSignature) => {
    const workflow = workflows.find((w) => w.id === signature.workflow);
    if (!workflow) {
      toast.error("Workflow not found for this signature");
      return;
    }
    setSelectedSignature({ signature, workflow });
  };

  const handleSigned = () => {
    loadPendingSignatures();
    setSelectedSignature(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Pending Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (pendingSignatures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Pending Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pending signatures</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Pending Signatures
            <Badge variant="secondary" className="ml-2">
              {pendingSignatures.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingSignatures.map((signature) => {
            const workflow = workflows.find((w) => w.id === signature.workflow);
            return (
              <div
                key={signature.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{signature.field_label}</div>
                    <div className="text-xs text-muted-foreground">
                      {workflow?.submission_template_name || "Form"}
                      {workflow?.submission_reference && ` • ${workflow.submission_reference}`}
                    </div>
                    {(signature.assigned_to_office_name ||
                      signature.assigned_to_department_name) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {signature.assigned_to_office_name ||
                          signature.assigned_to_department_name ||
                          signature.assigned_to_division_name}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Pending
                  </Badge>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSign(signature)}
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Sign
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {selectedSignature && (
        <FormSignatureDialog
          open={!!selectedSignature}
          onOpenChange={(open) => !open && setSelectedSignature(null)}
          signature={selectedSignature.signature}
          workflow={selectedSignature.workflow}
          onSigned={handleSigned}
        />
      )}
    </>
  );
}

