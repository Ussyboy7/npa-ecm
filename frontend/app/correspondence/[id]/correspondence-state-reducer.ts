/**
 * Reducer for managing correspondence detail page state
 */

import type { Correspondence, Minute } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/api/dms';

export interface CorrespondenceDetailState {
  minutes: Minute[];
  remoteCorrespondence: Correspondence | null;
  detailLoading: boolean;
  backendDelegation: {
    id: string;
    assistantId: string | number;
    assistantName?: string;
    principalId: string | number;
    principalName?: string;
    status: string;
    delegatedAt: string;
  } | null;
  linkedDocuments: DocumentRecord[];
  /** Linked documents the API refused, so the panel can say so instead of hiding them. */
  withheldLinkedDocumentCount: number;
  selectedMinute: Minute | null;
  selectedAttachmentIndex: number | null;
  selectedLinkedDocumentId: string | null;
  attachmentSearchQuery: string;
  selectedLinkedDocVersion: Record<string, number>;
  isPreviewFullscreen: boolean;
  documentFocus: boolean;
  mobileActiveTab: 'document' | 'routing';
}

export type CorrespondenceDetailAction =
  | { type: 'SET_MINUTES'; payload: Minute[] }
  | { type: 'SET_REMOTE_CORRESPONDENCE'; payload: Correspondence | null }
  | { type: 'SET_DETAIL_LOADING'; payload: boolean }
  | { type: 'SET_BACKEND_DELEGATION'; payload: CorrespondenceDetailState['backendDelegation'] }
  | { type: 'SET_LINKED_DOCUMENTS'; payload: DocumentRecord[] }
  | { type: 'SET_WITHHELD_LINKED_DOCUMENT_COUNT'; payload: number }
  | { type: 'SET_SELECTED_MINUTE'; payload: Minute | null }
  | { type: 'SET_SELECTED_ATTACHMENT_INDEX'; payload: number | null }
  | { type: 'SET_SELECTED_LINKED_DOCUMENT_ID'; payload: string | null }
  | { type: 'SET_ATTACHMENT_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_LINKED_DOC_VERSION'; payload: Record<string, number> }
  | { type: 'SET_PREVIEW_FULLSCREEN'; payload: boolean }
  | { type: 'SET_DOCUMENT_FOCUS'; payload: boolean }
  | { type: 'SET_MOBILE_ACTIVE_TAB'; payload: 'document' | 'routing' }
  | { type: 'RESET' };

export const initialState: CorrespondenceDetailState = {
  minutes: [],
  remoteCorrespondence: null,
  detailLoading: false,
  backendDelegation: null,
  linkedDocuments: [],
  withheldLinkedDocumentCount: 0,
  selectedMinute: null,
  selectedAttachmentIndex: null,
  selectedLinkedDocumentId: null,
  attachmentSearchQuery: '',
  selectedLinkedDocVersion: {},
  isPreviewFullscreen: false,
  documentFocus: false,
  mobileActiveTab: 'document',
};

export const correspondenceDetailReducer = (
  state: CorrespondenceDetailState,
  action: CorrespondenceDetailAction
): CorrespondenceDetailState => {
  switch (action.type) {
    case 'SET_MINUTES':
      return { ...state, minutes: action.payload };
    case 'SET_REMOTE_CORRESPONDENCE':
      return { ...state, remoteCorrespondence: action.payload };
    case 'SET_DETAIL_LOADING':
      return { ...state, detailLoading: action.payload };
    case 'SET_BACKEND_DELEGATION':
      return { ...state, backendDelegation: action.payload };
    case 'SET_LINKED_DOCUMENTS':
      return { ...state, linkedDocuments: action.payload };
    case 'SET_WITHHELD_LINKED_DOCUMENT_COUNT':
      return { ...state, withheldLinkedDocumentCount: action.payload };
    case 'SET_SELECTED_MINUTE':
      return { ...state, selectedMinute: action.payload };
    case 'SET_SELECTED_ATTACHMENT_INDEX':
      return {
        ...state,
        selectedAttachmentIndex: action.payload,
        selectedLinkedDocumentId: action.payload !== null ? null : state.selectedLinkedDocumentId,
      };
    case 'SET_SELECTED_LINKED_DOCUMENT_ID':
      return {
        ...state,
        selectedLinkedDocumentId: action.payload,
        selectedAttachmentIndex: action.payload ? null : state.selectedAttachmentIndex,
      };
    case 'SET_ATTACHMENT_SEARCH_QUERY':
      return { ...state, attachmentSearchQuery: action.payload };
    case 'SET_SELECTED_LINKED_DOC_VERSION':
      return { ...state, selectedLinkedDocVersion: action.payload };
    case 'SET_PREVIEW_FULLSCREEN':
      return { ...state, isPreviewFullscreen: action.payload };
    case 'SET_DOCUMENT_FOCUS':
      return { ...state, documentFocus: action.payload };
    case 'SET_MOBILE_ACTIVE_TAB':
      return { ...state, mobileActiveTab: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};
