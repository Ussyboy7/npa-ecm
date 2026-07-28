/** Backward-compatible re-export layer. */
export {
  asApiError,
  getApiErrorStatus,
  getApiErrorMessage,
  isApiForbidden,
  isApiNotFound,
  isApiUnauthorized,
  isNetworkError,
  isAccessDeniedError,
} from "@/lib/api-error";
export type { ApiErrorShape } from "@/lib/api-error";
