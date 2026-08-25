/**
 * State reducer for Register Correspondence form
 */

import { FormData, FlowType, DistributionState, createInitialFormData } from './register-utils';
import { FormStep } from './register-constants';

export type RegisterState = {
  currentStep: FormStep;
  formData: FormData;
  documentFiles: File[];
  flowType: FlowType;
  distributions: DistributionState;
  ui: {
    assignSearch: string;
    officeSearch: string;
    submitting: boolean;
    errors: Record<string, string>;
    hasDraft: boolean;
    mounted: boolean;
  };
};

export type RegisterAction =
  | { type: 'SET_STEP'; payload: FormStep }
  | { type: 'SET_FLOW_TYPE'; payload: FlowType }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<FormData> }
  | { type: 'SET_FORM_DATA'; payload: FormData }
  | { type: 'ADD_DOCUMENT_FILES'; payload: File[] }
  | { type: 'REMOVE_DOCUMENT_FILE'; payload: number }
  | { type: 'SET_DOCUMENT_FILES'; payload: File[] }
  | { type: 'SET_DISTRIBUTIONS'; payload: DistributionState }
  | { type: 'UPDATE_DISTRIBUTION'; payload: { type: 'directorates' | 'divisions' | 'departments'; ids: string[] } }
  | { type: 'SET_ASSIGN_SEARCH'; payload: string }
  | { type: 'SET_OFFICE_SEARCH'; payload: string }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_HAS_DRAFT'; payload: boolean }
  | { type: 'SET_MOUNTED'; payload: boolean }
  | { type: 'RESET_FORM'; payload?: { owningOfficeId?: string } };

export const createInitialState = (owningOfficeId?: string): RegisterState => {
  const formData = createInitialFormData(owningOfficeId);
  return {
    currentStep: 'basics',
    formData: {
      ...formData,
      // Reference number will be generated on client mount to avoid hydration mismatch
    },
    documentFiles: [],
    flowType: 'inward',
    distributions: {
      directorates: [],
      divisions: [],
      departments: [],
    },
    ui: {
      assignSearch: '',
      officeSearch: '',
      submitting: false,
      errors: {},
      hasDraft: false,
      mounted: false,
    },
  };
};

export const registerReducer = (
  state: RegisterState,
  action: RegisterAction
): RegisterState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_FLOW_TYPE':
      return {
        ...state,
        flowType: action.payload,
        distributions:
          action.payload === 'inward'
            ? { directorates: [], divisions: [], departments: [] }
            : state.distributions,
        formData:
          action.payload === 'inward'
            ? {
                ...state.formData,
                dispatchDate: '',
                recipientName: '',
              }
            : state.formData,
      };

    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        ui: {
          ...state.ui,
          errors: Object.keys(state.ui.errors).reduce((acc, key) => {
            if (action.payload[key as keyof FormData] !== undefined) {
              // Clear error for updated field
              return acc;
            }
            return { ...acc, [key]: state.ui.errors[key] };
          }, {} as Record<string, string>),
        },
      };

    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };

    case 'ADD_DOCUMENT_FILES':
      return {
        ...state,
        documentFiles: [...state.documentFiles, ...action.payload],
        ui: {
          ...state.ui,
          errors: { ...state.ui.errors, documentFiles: '' },
        },
      };

    case 'REMOVE_DOCUMENT_FILE':
      return {
        ...state,
        documentFiles: state.documentFiles.filter((_, i) => i !== action.payload),
      };

    case 'SET_DOCUMENT_FILES':
      return { ...state, documentFiles: action.payload };

    case 'SET_DISTRIBUTIONS':
      return { ...state, distributions: action.payload };

    case 'UPDATE_DISTRIBUTION':
      return {
        ...state,
        distributions: {
          ...state.distributions,
          [action.payload.type]: action.payload.ids,
        },
      };

    case 'SET_ASSIGN_SEARCH':
      return {
        ...state,
        ui: { ...state.ui, assignSearch: action.payload },
      };

    case 'SET_OFFICE_SEARCH':
      return {
        ...state,
        ui: { ...state.ui, officeSearch: action.payload },
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        ui: { ...state.ui, submitting: action.payload },
      };

    case 'SET_ERRORS':
      return {
        ...state,
        ui: { ...state.ui, errors: action.payload },
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        ui: { ...state.ui, errors: {} },
      };

    case 'SET_HAS_DRAFT':
      return {
        ...state,
        ui: { ...state.ui, hasDraft: action.payload },
      };

    case 'SET_MOUNTED':
      return {
        ...state,
        ui: { ...state.ui, mounted: action.payload },
      };

    case 'RESET_FORM': {
      const newFormData = createInitialFormData(action.payload?.owningOfficeId);
      return {
        ...state,
        currentStep: 'basics',
        formData: {
          ...newFormData,
          referenceNumber: "",
          owningOfficeId: action.payload?.owningOfficeId || state.formData.owningOfficeId,
        },
        documentFiles: [],
        distributions: {
          directorates: [],
          divisions: [],
          departments: [],
        },
        ui: {
          ...state.ui,
          errors: {},
          submitting: false,
        },
      };
    }

    default:
      return state;
  }
};

