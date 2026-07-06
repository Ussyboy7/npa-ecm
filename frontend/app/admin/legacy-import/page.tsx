"use client";

import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

const CORRESPONDENCE_CSV = `reference_number,subject,status,source,direction,sender_name,sender_organization,received_date,archive_level
LEG-2020-001,Legacy inward letter sample,archived,external,upward,External Org Ltd,,2020-01-15,division
`;

const DOCUMENTS_CSV = `title,reference_number,document_type,status,sensitivity,description,author_username
Legacy policy scan,LEG-DOC-001,policy,archived,internal,Imported metadata only,admin
`;

export default function LegacyImportPage() {
  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminPageShell
      title="Legacy Data Import"
      subtitle="CSV templates and CLI for migrating historical correspondence and document metadata."
      icon={Database}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Correspondence template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Import archived correspondence metadata (files linked separately).</p>
            <button
              type="button"
              className="text-primary underline text-sm"
              onClick={() => download("legacy-correspondence-template.csv", CORRESPONDENCE_CSV)}
            >
              Download CSV template
            </button>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              {`python manage.py import_legacy_records \\
  --type correspondence \\
  --file legacy-correspondence.csv \\
  --created-by admin \\
  --dry-run`}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Import document catalogue rows before attaching files via capture.</p>
            <button
              type="button"
              className="text-primary underline text-sm"
              onClick={() => download("legacy-documents-template.csv", DOCUMENTS_CSV)}
            >
              Download CSV template
            </button>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              {`python manage.py import_legacy_records \\
  --type documents \\
  --file legacy-documents.csv \\
  --created-by admin`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
