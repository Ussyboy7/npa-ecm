"use client";

import { CasesListContent } from "../components/CasesListContent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function OfficeCasesPage() {
  return (
    <ErrorBoundary>
      <>
        <CasesListContent 
          scope="office"
          title="Office Cases"
          description="Cases assigned to your office"
        />
      </>
    </ErrorBoundary>
  );
}

