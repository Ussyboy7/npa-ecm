"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { CasesListContent } from "../components/CasesListContent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function MyCasesPage() {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        <CasesListContent 
          scope="my"
          title="My Cases"
          description="Cases assigned to you personally"
        />
      </DashboardLayout>
    </ErrorBoundary>
  );
}

