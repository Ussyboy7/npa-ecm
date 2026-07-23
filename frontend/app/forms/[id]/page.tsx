"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { FormDocumentEditor } from "@/components/dms/FormDocumentEditor";
import { Button } from "@/components/ui/button";
import { fetchDocumentById } from "@/lib/dms-storage";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import { appType } from "@/lib/app-type";

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
    <>
      <div className="container mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => router.push("/dms")}
                aria-label="Back to Documents"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className={appType.pageTitleList}>Form Editor</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dms/${params.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in DMS
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-10 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className={appType.meta}>Loading form...</p>
          </div>
        ) : error || !formDocumentId ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-10 text-center">
            <p className={appType.meta}>{error || "Form document not found."}</p>
          </div>
        ) : (
          <FormDocumentEditor documentId={params.id} formDocumentId={formDocumentId} />
        )}
      </div>
    </>
  );
};

export default FormDetailPage;
