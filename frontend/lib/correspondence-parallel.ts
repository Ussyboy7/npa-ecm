import { apiFetch } from './api-client';
import type { ParallelRoutingGroup } from './npa-structure';

const mapGroup = (item: Record<string, unknown>): ParallelRoutingGroup => ({
  id: String(item.id),
  correspondenceId: String(item.correspondence ?? item.correspondence_id ?? ''),
  createdById: String(
    (item.created_by as Record<string, unknown> | undefined)?.id ?? item.created_by_id ?? '',
  ),
  createdByName:
    (item.created_by as Record<string, unknown> | undefined)?.username as string | undefined,
  mergeStrategy: (item.merge_strategy as ParallelRoutingGroup['mergeStrategy']) ?? 'all',
  isComplete: Boolean(item.is_complete),
  completedAt: item.completed_at ? String(item.completed_at) : undefined,
  totalBranches: Number(item.total_branches ?? 0),
  completedBranches: Number(item.completed_branches ?? 0),
  createdAt: item.created_at ? String(item.created_at) : undefined,
  updatedAt: item.updated_at ? String(item.updated_at) : undefined,
});

export const fetchParallelRoutingGroups = async (
  correspondenceId: string,
): Promise<ParallelRoutingGroup[]> => {
  const response = await apiFetch<Record<string, unknown>>(
    `/correspondence/parallel-routing-groups/?correspondence=${correspondenceId}&page_size=20`,
  );
  const results = Array.isArray(response.results) ? response.results : [];
  return results.map((item) => mapGroup(item as Record<string, unknown>));
};
