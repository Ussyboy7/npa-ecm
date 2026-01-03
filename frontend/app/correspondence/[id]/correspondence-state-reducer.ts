/**
 * Reducer for managing correspondence detail page state
 * Consolidates related state variables into a single reducer
 */

import type { Correspondence, Minute } from '@/lib/npa-structure';

export interface CorrespondenceDetailState {
  minutes: Minute[];
  remoteCorrespondence: Correspondence | null;
  detailLoading: boolean;
  backendDelegation: {
    id: string;
    assistantId: string | number;
    principalId: string | number;
    status: string;
    delegatedAt: string;
  } | null;
  linkedDocuments: unknown[];
  parallelRoutingGroups: unknown[];
  selectedMinute: Minute | null;
  selectedAttachmentIndex: number | null;
  attachmentSearchQuery: string;
  selectedLinkedDocVersion: Record<string, number>;
  isPreviewFullscreen: boolean;
  dragActive: boolean;
  mobileActiveTab: 'document' | 'thread' | 'actions';
}

export type CorrespondenceDetailAction =
  | { type: 'SET_MINUTES'; payload: Minute[] }
  | { type: 'SET_REMOTE_CORRESPONDENCE'; payload: Correspondence | null }
  | { type: 'SET_DETAIL_LOADING'; payload: boolean }
  | { type: 'SET_BACKEND_DELEGATION'; payload: CorrespondenceDetailState['backendDelegation'] }
  | { type: 'SET_LINKED_DOCUMENTS'; payload: unknown[] }
  | { type: 'SET_PARALLEL_ROUTING_GROUPS'; payload: unknown[] }
  | { type: 'SET_SELECTED_MINUTE'; payload: Minute | null }
  | { type: 'SET_SELECTED_ATTACHMENT_INDEX'; payload: number | null }
  | { type: 'SET_ATTACHMENT_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_LINKED_DOC_VERSION'; payload: Record<string, number> }
  | { type: 'SET_PREVIEW_FULLSCREEN'; payload: boolean }
  | { type: 'SET_DRAG_ACTIVE'; payload: boolean }
  | { type: 'SET_MOBILE_ACTIVE_TAB'; payload: 'document' | 'thread' | 'actions' }
  | { type: 'RESET' };

export const initialState: CorrespondenceDetailState = {
  minutes: [],
  remoteCorrespondence: null,
  detailLoading: false,
  backendDelegation: null,
  linkedDocuments: [],
  parallelRoutingGroups: [],
  selectedMinute: null,
  selectedAttachmentIndex: null,
  attachmentSearchQuery: '',
  selectedLinkedDocVersion: {},
  isPreviewFullscreen: false,
  dragActive: false,
  mobileActiveTab: 'thread',
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
    case 'SET_PARALLEL_ROUTING_GROUPS':
      return { ...state, parallelRoutingGroups: action.payload };
    case 'SET_SELECTED_MINUTE':
      return { ...state, selectedMinute: action.payload };
    case 'SET_SELECTED_ATTACHMENT_INDEX':
      return { ...state, selectedAttachmentIndex: action.payload };
    case 'SET_ATTACHMENT_SEARCH_QUERY':
      return { ...state, attachmentSearchQuery: action.payload };
    case 'SET_SELECTED_LINKED_DOC_VERSION':
      return { ...state, selectedLinkedDocVersion: action.payload };
    case 'SET_PREVIEW_FULLSCREEN':
      return { ...state, isPreviewFullscreen: action.payload };
    case 'SET_DRAG_ACTIVE':
      return { ...state, dragActive: action.payload };
    case 'SET_MOBILE_ACTIVE_TAB':
      return { ...state, mobileActiveTab: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

