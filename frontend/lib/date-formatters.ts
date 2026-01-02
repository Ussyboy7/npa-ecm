/**
 * Centralized date formatting utilities for consistency across the application.
 */

export function formatSealDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Format: "3 Dec 2025, 17:58" (en-GB format for consistency)
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

export function formatSealDateLong(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Format: "3 December 2025, 17:58"
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

