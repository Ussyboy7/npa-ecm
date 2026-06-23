"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Mail, Briefcase } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [context, setContext] = useState<'all' | 'documents' | 'correspondence' | 'cases'>('all');

  // Get context from URL params
  useEffect(() => {
    const urlContext = searchParams.get('context');
    if (urlContext && ['all', 'documents', 'correspondence', 'cases'].includes(urlContext)) {
      setContext(urlContext as 'all' | 'documents' | 'correspondence' | 'cases');
    }
  }, [searchParams]);

  const handleContextChange = (value: string) => {
    setContext(value as 'all' | 'documents' | 'correspondence' | 'cases');
    // Update URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('context');
    } else {
      params.set('context', value);
    }
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Search Documents</h1>
            <p className="text-muted-foreground mt-1">
              Search across all documents, correspondence, and cases with full-text search and advanced filters
            </p>
          </div>

          <Tabs value={context} onValueChange={handleContextChange} className="w-full">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
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

            <TabsContent value={context} className="mt-6">
              <AdvancedSearch
                context={context === 'all' ? undefined : context}
                onResultSelect={(result) => {
                  if (!result.id) return;
                  
                  // Determine result type
                  const resultType = result._type || (result.document_type ? 'document' : result.case_type ? 'case' : 'correspondence');
                  const isCorrespondence = resultType === 'correspondence';
                  const isCase = resultType === 'case';
                  
                  // Navigate to appropriate page
                  if (isCase) {
                    router.push(`/cases/${result.id}`);
                  } else if (isCorrespondence) {
                    // Check if we have a correspondence ID field
                    const corrId = result.correspondence_id || result.id;
                    if (corrId) {
                      router.push(`/correspondence/${corrId}`);
                    } else {
                      toast.error('Unable to navigate to correspondence item');
                    }
                  } else {
                    // Document - navigate to DMS detail page
                    router.push(`/dms/${result.id}`);
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SearchForm />
    </Suspense>
  );
}

