"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/lib/authorization";

export default function ActingAppointmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(APP_ROUTES.adminActingAppointments);
  }, [router]);
  return null;
}
