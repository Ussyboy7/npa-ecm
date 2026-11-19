"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FormsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dms?tab=forms");
  }, [router]);

  return null;
}
