"use client";

import { Suspense } from "react";
import AuthCallbackPage from "./AuthCallbackPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <AuthCallbackPage />
    </Suspense>
  );
}
