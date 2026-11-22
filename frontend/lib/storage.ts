import type { DraftFileMetadata, Draft } from './api/drafts';

export type { DraftFileMetadata, Draft };

import * as draftApi from '@/lib/api/drafts';

export const saveDraft = async (draft: Partial<Draft> & { correspondenceId: string; type: 'minute' | 'treatment'; content: string }): Promise<Draft> => {
  return await draftApi.saveDraft(draft);
};

export const getDraftByCorrespondence = async (correspondenceId: string, type: 'minute' | 'treatment'): Promise<Draft | null> => {
  return await draftApi.getDraftByCorrespondence(correspondenceId, type);
};

export const deleteDraft = async (draftId: string): Promise<void> => {
  await draftApi.deleteDraft(draftId);
};
