"use client";

import { AdminPageShell } from "@/components/shared/AdminPageShell";
import { PlatformTabList } from "@/components/admin/PlatformTabList";
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
      title="Platform"
      subtitle="CSV templates and CLI for migrating historical correspondence and document metadata."
      
      icon={Database}
    >
      <div className="mt-4">
        <PlatformTabList />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 p-4">
          <h3 className="text-base font-semibold mb-3">Correspondence template</h3>
          <div className="space-y-3 text-sm">
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
          </div>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <h3 className="text-base font-semibold mb-3">Documents template</h3>
          <div className="space-y-3 text-sm">
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
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
