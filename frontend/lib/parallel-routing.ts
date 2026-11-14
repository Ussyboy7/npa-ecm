import type { RoutePurpose } from '@/components/correspondence/PrimaryRoutePanel';

export type AssignmentOutcome = 'respond' | 'treat' | 'onward';

export type AssignmentMergeStrategy = 'independent' | 'all' | 'any' | 'majority';

export type BranchConfig = {
  purpose: RoutePurpose;
  minuteText: string;
  outcome: AssignmentOutcome;
};

export type ParallelRecipientPayload = {
  user_id?: string;
  office_id?: string;
  purpose: RoutePurpose;
  minute_text: string;
  outcome: AssignmentOutcome;
};

export function branchKey(type: 'user' | 'office', id: string): string {
  return `${type}:${id}`;
}

export function buildParallelRecipients(
  parallelUserIds: string[],
  parallelOfficeIds: string[],
  branchConfigs: Record<string, BranchConfig>,
  fallback: { purpose: RoutePurpose; minuteText: string; outcome?: AssignmentOutcome },
): ParallelRecipientPayload[] {
  const recipients: ParallelRecipientPayload[] = [];
  const outcome = fallback.outcome ?? 'respond';
  for (const userId of parallelUserIds) {
    const cfg = branchConfigs[branchKey('user', userId)] ?? { ...fallback, outcome };
    const text = cfg.minuteText.trim() || fallback.minuteText.trim();
    if (!text) continue;
    recipients.push({
      user_id: userId,
      purpose: cfg.purpose ?? fallback.purpose,
      minute_text: text,
      outcome: cfg.outcome ?? outcome,
    });
  }
  for (const officeId of parallelOfficeIds) {
    const cfg = branchConfigs[branchKey('office', officeId)] ?? { ...fallback, outcome };
    const text = cfg.minuteText.trim() || fallback.minuteText.trim();
    if (!text) continue;
    recipients.push({
      office_id: officeId,
      purpose: cfg.purpose ?? fallback.purpose,
      minute_text: text,
      outcome: cfg.outcome ?? outcome,
    });
  }
  return recipients;
}

export async function submitParallelRoute(
  apiFetch: (path: string, options?: Record<string, unknown>) => Promise<unknown>,
  params: {
    correspondenceId: string;
    parallelUserIds: string[];
    parallelOfficeIds: string[];
    branchConfigs: Record<string, BranchConfig>;
    defaultPurpose: RoutePurpose;
    defaultMinuteText: string;
    mergeStrategy?: AssignmentMergeStrategy;
    parentMinuteId?: string;
    signal?: AbortSignal;
  },
): Promise<void> {
  const recipients = buildParallelRecipients(
    params.parallelUserIds,
    params.parallelOfficeIds,
    params.branchConfigs,
    { purpose: params.defaultPurpose, minuteText: params.defaultMinuteText },
  );
  if (recipients.length < 2) {
    throw new Error('Assign separately requires at least two recipients with instructions');
  }
  await apiFetch('/correspondence/minutes/parallel-route/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: params.signal,
    body: JSON.stringify({
      correspondence_id: params.correspondenceId,
      merge_strategy: params.mergeStrategy ?? 'independent',
      parent_minute_id: params.parentMinuteId,
      recipients,
    }),
  });
}

export async function submitCcDistribution(
  apiFetch: (path: string, options?: Record<string, unknown>) => Promise<unknown>,
  correspondenceId: string,
  userIds: string[],
  officeIds: string[],
  addedById?: string,
  minuteId?: string,
): Promise<void> {
  await Promise.all([
    ...userIds.map((userId) =>
      apiFetch('/correspondence/distribution/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondenceId,
          recipient_type: 'user',
          user: userId,
          purpose: 'information',
          added_by_id: addedById,
          minute_id: minuteId,
        }),
      }),
    ),
    ...officeIds.map((officeId) =>
      apiFetch('/correspondence/distribution/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondenceId,
          recipient_type: 'office',
          office: officeId,
          purpose: 'information',
          added_by_id: addedById,
          minute_id: minuteId,
        }),
      }),
    ),
  ]);
}
