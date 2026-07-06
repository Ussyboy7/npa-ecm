/** Helpers for HTTP errors from apiFetch */

export type ApiErrorShape = {
  status?: number;
  apiMessage?: string;
  message?: string;
};

export function asApiError(error: unknown): ApiErrorShape {
  if (error && typeof error === "object") {
    return error as ApiErrorShape;
  }
  return { message: String(error) };
}

export function getApiErrorStatus(error: unknown): number | undefined {
  const status = asApiError(error).status;
  return typeof status === "number" ? status : undefined;
}

export function isApiForbidden(error: unknown): boolean {
  return getApiErrorStatus(error) === 403;
}

export function isApiNotFound(error: unknown): boolean {
  return getApiErrorStatus(error) === 404;
}

/** Detail fetch failed due to missing record or insufficient access. */
export function isAccessDeniedError(error: unknown): boolean {
  return isApiForbidden(error) || isApiNotFound(error);
}
