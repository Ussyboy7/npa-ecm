"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useRouter } from 'next/navigation';

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
            if (result.id) {
              router.push(`/dms/${result.id}`);
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}

