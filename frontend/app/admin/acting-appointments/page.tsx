"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ActingAppointmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/organization/acting");
  }, [router]);
  return null;
}
