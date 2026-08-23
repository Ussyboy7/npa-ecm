"use client";

import { AdvancedSearch } from "@/components/search/AdvancedSearch";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { useEffect, useState, Suspense } from "react";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Mail, Briefcase, Layers } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { buildSearchHighlightParams } from "@/lib/search-highlight";

type SearchContext = "all" | "documents" | "correspondence" | "cases";

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<SearchContext>("all");

  useEffect(() => {
    const urlContext = searchParams.get("context");
    if (urlContext && ["all", "documents", "correspondence", "cases"].includes(urlContext)) {
      setContext(urlContext as SearchContext);
    }
  }, [searchParams]);

  const handleContextChange = (value: string) => {
    const next = value as SearchContext;
    setContext(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("context");
    } else {
      params.set("context", next);
    }
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search", { scroll: false });
  };

  return (
    <ErrorBoundary>
      <QueuePageShell
        title="Search"
        subtitle="Find the exact document, correspondence, or case you need using filters and full-text search."
      >
        <Tabs value={context} onValueChange={handleContextChange} className="w-full space-y-5">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="correspondence" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Correspondence
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Cases
            </TabsTrigger>
          </TabsList>

          <TabsContent value={context} className="mt-0">
              <AdvancedSearch
              context={context}
              onResultSelect={(result, searchQuery) => {
                if (!result.id) return;

                const resultType =
                  result._type ||
                  (result.document_type ? "document" : result.case_type ? "case" : "correspondence");
                const isCorrespondence = resultType === "correspondence";
                const isCase = resultType === "case";
                const matchField = String(result._match_field ?? result.match_field ?? "");
                const qs = buildSearchHighlightParams(searchQuery, matchField);

                if (isCase) {
                  router.push(`/cases/${result.id}${qs}`);
                } else if (isCorrespondence) {
                  const corrId = result.correspondence_id || result.id;
                  if (corrId) {
                    router.push(`/correspondence/${corrId}${qs}`);
                  } else {
                    toast.error("Unable to navigate to correspondence item");
                  }
                } else {
                  router.push(`/dms/${result.id}${qs}`);
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </QueuePageShell>
    </ErrorBoundary>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Loading..." />}>
      <SearchForm />
    </Suspense>
  );
}
