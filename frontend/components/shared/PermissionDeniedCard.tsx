"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PermissionCheckResult } from "@/hooks/use-permission-check";

type PermissionDeniedCardProps = {
  title?: string;
  check: PermissionCheckResult | null;
  loading?: boolean;
  fallbackMessage?: string;
  onBack?: () => void;
  backLabel?: string;
};

export function PermissionDeniedCard({
  title = "Access Restricted",
  check,
  loading = false,
  fallbackMessage = "You do not have permission to perform this action.",
  onBack,
  backLabel = "Go Back",
}: PermissionDeniedCardProps) {
  const description = check?.reason || fallbackMessage;
  const suggestion = check?.suggestion;

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {loading ? "Checking your permissions…" : description}
        </CardDescription>
      </CardHeader>
      {!loading && suggestion && (
        <CardContent className="text-center text-sm text-muted-foreground border-t pt-4 mx-6 mb-2">
          <p>{suggestion}</p>
          {check?.role_name && (
            <p className="mt-2 text-xs">Current role: {check.role_name}</p>
          )}
        </CardContent>
      )}
      {onBack && (
        <CardContent className="text-center pb-6">
          <Button variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
