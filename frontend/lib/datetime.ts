const DEFAULT_DATE_LOCALE = "en-GB";
const US_DATE_LOCALE = "en-US";

export function formatDate(
  input: string | Date,
  locale = DEFAULT_DATE_LOCALE,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  if (!input) return "";
  const value = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(value.getTime())) return "N/A";
  return value.toLocaleDateString(locale, options);
}

export function formatDateTime(
  input: string | Date,
  locale = DEFAULT_DATE_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  if (!input) return "";
  const value = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(value.getTime())) return "N/A";
  return value.toLocaleString(locale, options);
}

/** Long month name format used in correspondence views (en-US). */
export function formatDateLong(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(US_DATE_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short MM/DD/YYYY format for consistent rendering. */
export function formatDateShort(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(US_DATE_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Format date as YYYY-MM-DD for API requests. */
export function formatDateForAPI(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatSealDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString(DEFAULT_DATE_LOCALE, {
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
    return date.toLocaleString(DEFAULT_DATE_LOCALE, {
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
