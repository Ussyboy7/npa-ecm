import Image from "next/image";
import { Loader2 } from "lucide-react";
import { NPA_BRAND_NAME, NPA_LOGO_URL } from "@/lib/branding";

interface NpaLoadingProps {
  message?: string;
  /** Reserve the full viewport for public routes with no app shell. */
  fullScreen?: boolean;
}

/** Canonical NPA-branded loading surface. */
export function NpaLoading({ message = "Loading…", fullScreen = false }: NpaLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6"
          : "min-h-[50vh] w-full flex flex-col items-center justify-center bg-background gap-3 p-6"
      }
    >
      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border flex-shrink-0">
        <Image
          src={NPA_LOGO_URL}
          alt={NPA_BRAND_NAME}
          fill
          unoptimized
          className="object-contain p-1.5"
          sizes="48px"
          priority
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}