"use client";

import { CasesListContent } from "../components/CasesListContent";
import { useScopeChecks } from "@/hooks/use-scope-checks";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function AllCasesPage() {
  const scopeChecks = useScopeChecks();
  const scopeLabel = scopeChecks.caseScope === "organization" 
    ? "All Cases" 
    : `All Cases (${scopeChecks.caseScope})`;

  return (
    <ErrorBoundary>
      <>
        <CasesListContent 
          scope="all"
          title={scopeLabel}
          description="All cases in your scope"
        />
      </>
    </ErrorBoundary>
  );
}

