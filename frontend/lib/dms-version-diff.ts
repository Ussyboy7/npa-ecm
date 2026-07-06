import { apiFetch } from "./api-client";
import { isRecord, asString, asBoolean } from "./type-utils";

export interface DocumentVersionDiff {
  hasContent: boolean;
  leftVersionId?: string;
  rightVersionId?: string;
  leftVersionNumber: number;
  rightVersionNumber: number;
  addedLines: number;
  removedLines: number;
  unifiedDiff: string;
  summary: string;
}

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const mapDiff = (data: Record<string, unknown>): DocumentVersionDiff => ({
  hasContent: asBoolean(data.has_content, false),
  leftVersionId: data.left_version_id ? asString(data.left_version_id) : undefined,
  rightVersionId: data.right_version_id ? asString(data.right_version_id) : undefined,
  leftVersionNumber: asNumber(data.left_version_number, 0),
  rightVersionNumber: asNumber(data.right_version_number, 0),
  addedLines: asNumber(data.added_lines, 0),
  removedLines: asNumber(data.removed_lines, 0),
  unifiedDiff: asString(data.unified_diff, ""),
  summary: asString(data.summary, ""),
});

export async function fetchDocumentVersionDiff(
  olderVersionId: string,
  newerVersionId: string,
): Promise<DocumentVersionDiff> {
  const response = await apiFetch<unknown>(
    `/dms/versions/${olderVersionId}/diff/?compare_with=${encodeURIComponent(newerVersionId)}`,
  );
  if (!isRecord(response)) {
    throw new Error("Invalid diff response");
  }
  return mapDiff(response);
}
