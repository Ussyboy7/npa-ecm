"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SearchPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Advanced Search</h1>
          <p className="text-muted-foreground mt-1">
            Search across all documents and correspondence with full-text search and advanced filters
          </p>
        </div>
        <AdvancedSearch
          onResultSelect={(result) => {
            if (!result.id) return;
            
            // Determine result type
            const resultType = result._type || (result.document_type ? 'document' : 'correspondence');
            const isCorrespondence = resultType === 'correspondence';
            
            // Navigate to appropriate page
            if (isCorrespondence) {
              // Check if we have a correspondence ID field
              const corrId = result.id || result.correspondence_id;
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
      </div>
    </DashboardLayout>
  );
}

