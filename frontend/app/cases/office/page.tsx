"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { CasesListContent } from "../components/CasesListContent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function OfficeCasesPage() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <CasesListContent 
          scope="office"
          title="Office Cases"
          description="Cases assigned to your office"
        />
      </DashboardLayout>
    </ErrorBoundary>
  );
}

