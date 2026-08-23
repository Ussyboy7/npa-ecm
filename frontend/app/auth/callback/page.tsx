"use client";

import { Suspense } from "react";
import { PageSuspenseFallback } from "@/components/shared/PageSuspenseFallback";
import AuthCallbackPage from "./AuthCallbackPage";

export default function Page() {
  return (
    <Suspense fallback={<PageSuspenseFallback />}>
      <AuthCallbackPage />
    </Suspense>
  );
}
