import { apiFetch } from './api-client';
import type { ParallelBranch } from './npa-structure';

const mapBranch = (item: Record<string, unknown>): ParallelBranch => ({
  minuteId: String(item.minute_id ?? item.minuteId ?? ''),
  groupId: item.group_id || item.groupId ? String(item.group_id ?? item.groupId) : null,
  targetKind: (item.target_kind ?? item.targetKind) === 'user' ? 'user' : 'office',
  targetId: String(item.target_id ?? item.targetId ?? ''),
  targetLabel: String(item.target_label ?? item.targetLabel ?? 'Unknown'),
  status: (item.status as ParallelBranch['status']) ?? 'pending',
  deadline: item.deadline || item.response_deadline ? String(item.deadline ?? item.response_deadline) : null,
  branchOriginatorId:
    item.branch_originator_id || item.branchOriginatorId
      ? String(item.branch_originator_id ?? item.branchOriginatorId)
      : null,
});

export const fetchParallelBranches = async (
  correspondenceId: string,
): Promise<ParallelBranch[]> => {
  const data = await apiFetch<unknown>(
    `/correspondence/items/${correspondenceId}/parallel-branches/`,
  );
  return Array.isArray(data)
    ? (data as Record<string, unknown>[]).map(mapBranch)
    : [];
};

export const remindParallelBranch = async (
  correspondenceId: string,
  payload: { minute_id?: string; parallel_group_id?: string; office_id?: string; user_id?: string; custom_message?: string },
): Promise<Record<string, unknown>> => {
  return apiFetch<Record<string, unknown>>(
    `/correspondence/items/${correspondenceId}/remind-branch/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const forceCompleteParallelBranch = async (
  correspondenceId: string,
  payload: { minute_id?: string; parallel_group_id?: string; office_id?: string; user_id?: string },
): Promise<Record<string, unknown>> => {
  return apiFetch<Record<string, unknown>>(
    `/correspondence/items/${correspondenceId}/force-complete-branch/`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};
