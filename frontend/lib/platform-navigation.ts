import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

/** First Platform section the current user may open, or null when none. */
export function getPlatformHomePath(
  visibility: SidebarVisibility,
): string | null {
  if (visibility.showSystemHealth) return "/admin/platform/health";
  if (visibility.showHelpdeskQueue) return "/admin/platform/support";
  if (visibility.showIntegrationHub) return "/admin/platform/integrations";
  if (visibility.showLegacyImport) return "/admin/platform/legacy-import";
  return null;
}
