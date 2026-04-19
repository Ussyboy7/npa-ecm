"use client";

import { createRoot } from "react-dom/client";
import { DigitalSealPreview, type DigitalSealPreviewHandle } from "@/components/seals/DigitalSealPreview";
import { uploadSealImage } from "@/lib/api/seal-images";

type SealCacheInput = {
  serialNumber: string;
  officeName: string;
  officeTitle: string;
  sealedBy: string;
  sealedAt: string;
  signatureImageUrl?: string;
  existingSealImageUrl?: string;
};

const inFlightBySerial = new Map<string, Promise<void>>();
const attemptedBySerial = new Set<string>();

export async function ensureSealImageCached(input: SealCacheInput): Promise<void> {
  const serial = input.serialNumber;
  if (!serial) return;
  if (attemptedBySerial.has(serial)) return;

  const existing = inFlightBySerial.get(serial);
  if (existing) return existing;

  const work = (async () => {
    attemptedBySerial.add(serial);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "1px";
    host.style.height = "1px";
    host.style.overflow = "hidden";
    document.body.appendChild(host);

    const root = createRoot(host);
    let done = false;

    const previewRef = { current: null as DigitalSealPreviewHandle | null };

    root.render(
      <DigitalSealPreview
        ref={(h) => {
          previewRef.current = h;
        }}
        officeName={input.officeName}
        officeTitle={input.officeTitle}
        serialNumber={input.serialNumber}
        signatureImage={input.signatureImageUrl}
        signatureText={input.sealedBy}
        timestamp={input.sealedAt}
        size={240}
        showQR={true}
        verificationBaseUrl={window.location.origin}
      />,
    );

    const tryUpload = async () => {
      const canvas = previewRef.current?.getCanvas();
      if (!canvas) return false;
      const dataUrl = canvas.toDataURL("image/png");
      if (!dataUrl.startsWith("data:image/png;base64,")) return false;
      if (dataUrl.length < 20_000) return false;
      await uploadSealImage(serial, dataUrl);
      return true;
    };

    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (done) break;
        try {
          const ok = await tryUpload();
          if (ok) break;
        } catch {
          break;
        }
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      done = true;
      try {
        root.unmount();
      } catch {}
      try {
        host.remove();
      } catch {}
    }
  })();

  inFlightBySerial.set(serial, work);
  try {
    await work;
  } finally {
    inFlightBySerial.delete(serial);
  }
}
