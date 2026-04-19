"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FormDocumentEditor } from "@/components/dms/FormDocumentEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { fetchDocumentById } from "@/lib/dms-storage";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";

const FormDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDocumentId, setFormDocumentId] = useState<string | null>(null);

  const loadFormDocument = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);

    try {
      const document = await fetchDocumentById(params.id);
      if (document.documentType !== "form") {
        setError("This document is not a form.");
        return;
      }

      if (document.form_document?.id) {
        setFormDocumentId(document.form_document.id);
        return;
      }

      const formDocsResponse = await apiFetch<Array<{ id: string }> | { results?: Array<{ id: string }> }>(
        `/dms/form-documents/?document=${params.id}`
      );
      const formDocs = Array.isArray(formDocsResponse)
        ? formDocsResponse
        : Array.isArray(formDocsResponse?.results)
          ? formDocsResponse.results
          : [];

      if (formDocs.length > 0) {
        setFormDocumentId(formDocs[0].id);
        return;
      }

      setError("Form document data was not found.");
    } catch (err: unknown) {
      logError("Failed to load form detail page", err);
      setError("Failed to load form document.");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void loadFormDocument();
  }, [loadFormDocument]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/forms")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dms/${params.id}`)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in DMS
          </Button>
        </div>

        <HelpGuideCard
          title="Form Workspace"
          description="Complete, route, sign, and track this form in the dedicated forms workflow."
          links={[{ label: "Forms Library", href: "/forms" }, { label: "Help & Guides", href: "/help" }]}
        />

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading form...
            </CardContent>
          </Card>
        ) : error || !formDocumentId ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              {error || "Form document not found."}
            </CardContent>
          </Card>
        ) : (
          <FormDocumentEditor documentId={params.id} formDocumentId={formDocumentId} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default FormDetailPage;
