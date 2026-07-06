"use client";

import { CasesListContent } from "../components/CasesListContent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function MyCasesPage() {
  return (
    <ErrorBoundary>
      <>
        <CasesListContent 
          scope="my"
          title="My Cases"
          description="Cases assigned to you personally"
        />
      </>
    </ErrorBoundary>
  );
}

