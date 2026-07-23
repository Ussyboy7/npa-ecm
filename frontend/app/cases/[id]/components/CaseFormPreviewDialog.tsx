"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { getFormDocument } from "@/lib/api/dms-forms";
import { getFormTemplate } from "@/lib/api/forms";
import type { FormTemplate } from "@/lib/types/forms";
import { logError } from "@/lib/client-logger";
import { ExternalLink, Loader2 } from "lucide-react";

interface CaseFormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formDocumentId: string | null;
  titleHint?: string | null;
}

export function CaseFormPreviewDialog({
  open,
  onOpenChange,
  formDocumentId,
  titleHint,
}: CaseFormPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [dmsDocumentId, setDmsDocumentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !formDocumentId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTemplate(null);
    setFormData({});
    setStatus(null);
    setTitle(titleHint ?? null);
    setDmsDocumentId(null);

    void (async () => {
      try {
        const doc = await getFormDocument(formDocumentId);
        if (cancelled) return;

        if (!doc.template?.id) {
          setError("This form has no template to preview.");
          return;
        }

        const tpl = await getFormTemplate(doc.template.id);
        if (cancelled) return;

        setTemplate(tpl);
        setFormData(doc.form_data ?? {});
        setStatus(doc.status);
        setTitle(doc.document?.title || doc.template.name || titleHint || "Form");
        setDmsDocumentId(doc.document?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        logError("Failed to load form preview", err);
        setError("Could not load form preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formDocumentId, titleHint]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" height="fill">
        <DialogHeader>
          <DialogTitle className="pr-8 truncate">{title || titleHint || "Form preview"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            Read-only preview of the linked form.
            {status ? (
              <Badge variant="secondary" className="text-[10px] h-5 capitalize">
                {status.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading form…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : template ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4">
              <DynamicFormRenderer template={template} initialData={formData} disabled />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="compact" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {dmsDocumentId ? (
            <Button size="compact" asChild>
              <Link href={`/forms/${dmsDocumentId}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open form
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
