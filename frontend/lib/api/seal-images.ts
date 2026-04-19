"use client";

import { apiFetch } from "@/lib/api-client";

export async function uploadSealImage(serialNumber: string, imageDataUrl: string) {
  return apiFetch<{ seal_image_url: string | null }>(`/accounts/seal/image/${encodeURIComponent(serialNumber)}/`, {
    method: "POST",
    body: JSON.stringify({ image_data_url: imageDataUrl }),
  });
}

