import { ERROR_UNKNOWN } from "@/lib/constants";
import { isRecord } from "@/lib/type-utils";

export type ApiErrorShape = {
  status?: number;
  apiMessage?: string;
  message?: string;
  body?: string;
};

const toStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const toNumberValue = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const getNested = (root: unknown, keys: string[]): unknown => {
  let current: unknown = root;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
};

export function asApiError(error: unknown): ApiErrorShape {
  if (isRecord(error)) {
    const status =
      toNumberValue(error.status) ??
      toNumberValue(getNested(error, ["response", "status"])) ??
      toNumberValue(getNested(error, ["response", "data", "status_code"]));
    const apiMessage =
      toStringValue(error.apiMessage) ??
      toStringValue(getNested(error, ["response", "data", "detail"])) ??
      toStringValue(getNested(error, ["response", "data", "message"])) ??
      toStringValue(getNested(error, ["response", "data", "error"]));
    const message =
      toStringValue(error.message) ??
      (error instanceof Error ? toStringValue(error.message) : undefined);
    const body = toStringValue(error.body);
    return { status, apiMessage, message, body };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error ?? ERROR_UNKNOWN) };
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return asApiError(error).status;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  const parsed = asApiError(error);
  return parsed.apiMessage || parsed.message || fallback;
}

export function isApiForbidden(error: unknown): boolean {
  return getApiErrorStatus(error) === 403;
}

export function isApiNotFound(error: unknown): boolean {
  return getApiErrorStatus(error) === 404;
}

export function isApiUnauthorized(error: unknown): boolean {
  return getApiErrorStatus(error) === 401;
}

export function isNetworkError(error: unknown): boolean {
  const status = getApiErrorStatus(error);
  if (typeof status === "number") return false;
  const message = getApiErrorMessage(error, ERROR_UNKNOWN).toLowerCase();
  return message.includes("network") || message.includes("fetch") || message.includes("failed to fetch");
}

export function isAccessDeniedError(error: unknown): boolean {
  return isApiForbidden(error) || isApiNotFound(error);
}
