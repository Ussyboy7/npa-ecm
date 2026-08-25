import { describe, it, expect } from 'vitest';
import { registerReducer, createInitialState, RegisterState } from '../register-state-reducer';
import type { RegisterAction } from '../register-state-reducer';

const baseState: RegisterState = {
  currentStep: 'basics',
  formData: {
    subject: '',
    senderName: '',
    senderOrganization: '',
    senderEmail: '',
    senderPhone: '',
    receivedDate: '2025-01-01',
    letterDate: '',
    dispatchDate: '',
    priority: 'medium',
    referenceNumber: '',
    assignTo: '',
    divisionId: '',
    documentType: 'letter',
    tags: '',
    owningOfficeId: '',
    senderReference: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    remarks: '',
    correspondenceSource: undefined,
    hasPhysicalCopy: false,
  },
  documentFiles: [],
  linkedDocumentIds: [],
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

describe('registerReducer', () => {
  it('returns initial state when called with undefined state', () => {
    const state = createInitialState();
    expect(state.currentStep).toBe('basics');
    expect(state.flowType).toBe('inward');
    expect(state.documentFiles).toEqual([]);
    expect(state.distributions).toEqual({ directorates: [], divisions: [], departments: [] });
    expect(state.ui.submitting).toBe(false);
    expect(state.ui.errors).toEqual({});
  });

  it('handles SET_STEP', () => {
    const action: RegisterAction = { type: 'SET_STEP', payload: 'documents' };
    const next = registerReducer(baseState, action);
    expect(next.currentStep).toBe('documents');
  });

  it('handles SET_FLOW_TYPE to outward', () => {
    const action: RegisterAction = { type: 'SET_FLOW_TYPE', payload: 'outward' };
    const next = registerReducer(baseState, action);
    expect(next.flowType).toBe('outward');
    expect(next.distributions).toEqual(baseState.distributions);
    expect(next.formData.dispatchDate).toBe('');
    expect(next.formData.recipientName).toBe('');
  });

  it('handles SET_FLOW_TYPE to inward resets distributions', () => {
    const state: RegisterState = {
      ...baseState,
      flowType: 'outward',
      distributions: {
        directorates: ['dir-1'],
        divisions: [],
        departments: [],
      },
      formData: {
        ...baseState.formData,
        dispatchDate: '2025-03-01',
        recipientName: 'Test Recipient',
      },
    };
    const action: RegisterAction = { type: 'SET_FLOW_TYPE', payload: 'inward' };
    const next = registerReducer(state, action);
    expect(next.flowType).toBe('inward');
    expect(next.distributions).toEqual({ directorates: [], divisions: [], departments: [] });
    expect(next.formData.dispatchDate).toBe('');
    expect(next.formData.recipientName).toBe('');
  });

  it('handles UPDATE_FORM_DATA', () => {
    const action: RegisterAction = { type: 'UPDATE_FORM_DATA', payload: { subject: 'Test Subject' } };
    const next = registerReducer(baseState, action);
    expect(next.formData.subject).toBe('Test Subject');
  });

  it('handles UPDATE_FORM_DATA clears error for updated field', () => {
    const state: RegisterState = {
      ...baseState,
      ui: { ...baseState.ui, errors: { subject: 'Subject is required' } },
    };
    const action: RegisterAction = { type: 'UPDATE_FORM_DATA', payload: { subject: 'New' } };
    const next = registerReducer(state, action);
    expect(next.formData.subject).toBe('New');
    expect(next.ui.errors.subject).toBeUndefined();
  });

  it('handles UPDATE_FORM_DATA keeps errors for non-updated fields', () => {
    const state: RegisterState = {
      ...baseState,
      ui: { ...baseState.ui, errors: { subject: 'Subject is required', assignTo: 'Assign is required' } },
    };
    const action: RegisterAction = { type: 'UPDATE_FORM_DATA', payload: { subject: 'New' } };
    const next = registerReducer(state, action);
    expect(next.ui.errors.subject).toBeUndefined();
    expect(next.ui.errors.assignTo).toBe('Assign is required');
  });

  it('handles ADD_DOCUMENT_FILES', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const action: RegisterAction = { type: 'ADD_DOCUMENT_FILES', payload: [file] };
    const next = registerReducer(baseState, action);
    expect(next.documentFiles).toHaveLength(1);
    expect(next.documentFiles[0]).toBe(file);
  });

  it('handles ADD_DOCUMENT_FILES appends to existing files', () => {
    const file1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const file2 = new File(['b'], 'b.pdf', { type: 'application/pdf' });
    const state: RegisterState = { ...baseState, documentFiles: [file1] };
    const action: RegisterAction = { type: 'ADD_DOCUMENT_FILES', payload: [file2] };
    const next = registerReducer(state, action);
    expect(next.documentFiles).toHaveLength(2);
  });

  it('handles REMOVE_DOCUMENT_FILE', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ];
    const state: RegisterState = { ...baseState, documentFiles: files };
    const action: RegisterAction = { type: 'REMOVE_DOCUMENT_FILE', payload: 0 };
    const next = registerReducer(state, action);
    expect(next.documentFiles).toHaveLength(1);
  });

  it('handles SET_DISTRIBUTIONS', () => {
    const dist = { directorates: ['dir-1'], divisions: [], departments: [] };
    const action: RegisterAction = { type: 'SET_DISTRIBUTIONS', payload: dist };
    const next = registerReducer(baseState, action);
    expect(next.distributions).toEqual(dist);
  });

  it('handles SET_SUBMITTING', () => {
    const action: RegisterAction = { type: 'SET_SUBMITTING', payload: true };
    const next = registerReducer(baseState, action);
    expect(next.ui.submitting).toBe(true);
  });

  it('handles SET_ERRORS', () => {
    const errors = { subject: 'Subject is required' };
    const action: RegisterAction = { type: 'SET_ERRORS', payload: errors };
    const next = registerReducer(baseState, action);
    expect(next.ui.errors).toEqual(errors);
  });

  it('handles CLEAR_ERRORS', () => {
    const state: RegisterState = {
      ...baseState,
      ui: { ...baseState.ui, errors: { subject: 'err' } },
    };
    const action: RegisterAction = { type: 'CLEAR_ERRORS' };
    const next = registerReducer(state, action);
    expect(next.ui.errors).toEqual({});
  });

  it('handles RESET_FORM', () => {
    const state: RegisterState = {
      ...baseState,
      currentStep: 'documents',
      formData: { ...baseState.formData, subject: 'Old', owningOfficeId: 'office-1' },
      documentFiles: [new File(['x'], 'x.pdf', { type: 'application/pdf' })],
      distributions: { directorates: ['dir-1'], divisions: [], departments: [] },
      ui: { ...baseState.ui, errors: { subject: 'err' }, submitting: true },
    };
    const action: RegisterAction = { type: 'RESET_FORM', payload: { owningOfficeId: 'office-2' } };
    const next = registerReducer(state, action);
    expect(next.currentStep).toBe('basics');
    expect(next.formData.subject).toBe('');
    expect(next.formData.owningOfficeId).toBe('office-2');
    expect(next.documentFiles).toEqual([]);
    expect(next.distributions).toEqual({ directorates: [], divisions: [], departments: [] });
    expect(next.ui.errors).toEqual({});
    expect(next.ui.submitting).toBe(false);
  });

  it('handles SET_FORM_DATA', () => {
    const payload = { ...baseState.formData, subject: 'Full Override' };
    const action: RegisterAction = { type: 'SET_FORM_DATA', payload };
    const next = registerReducer(baseState, action);
    expect(next.formData.subject).toBe('Full Override');
  });

  it('handles SET_DOCUMENT_FILES', () => {
    const files = [new File(['x'], 'x.pdf', { type: 'application/pdf' })];
    const action: RegisterAction = { type: 'SET_DOCUMENT_FILES', payload: files };
    const next = registerReducer(baseState, action);
    expect(next.documentFiles).toHaveLength(1);
  });

  it('handles UPDATE_DISTRIBUTION', () => {
    const action: RegisterAction = {
      type: 'UPDATE_DISTRIBUTION',
      payload: { type: 'directorates', ids: ['dir-1'] },
    };
    const next = registerReducer(baseState, action);
    expect(next.distributions.directorates).toEqual(['dir-1']);
  });

  it('handles SET_ASSIGN_SEARCH and SET_OFFICE_SEARCH', () => {
    const a1: RegisterAction = { type: 'SET_ASSIGN_SEARCH', payload: 'john' };
    const a2: RegisterAction = { type: 'SET_OFFICE_SEARCH', payload: 'office' };
    const s1 = registerReducer(baseState, a1);
    expect(s1.ui.assignSearch).toBe('john');
    const s2 = registerReducer(s1, a2);
    expect(s2.ui.officeSearch).toBe('office');
  });

  it('handles SET_HAS_DRAFT and SET_MOUNTED', () => {
    const a1: RegisterAction = { type: 'SET_HAS_DRAFT', payload: true };
    const a2: RegisterAction = { type: 'SET_MOUNTED', payload: true };
    const s1 = registerReducer(baseState, a1);
    expect(s1.ui.hasDraft).toBe(true);
    const s2 = registerReducer(s1, a2);
    expect(s2.ui.mounted).toBe(true);
  });

  it('returns current state for unknown action type', () => {
    const action = { type: 'UNKNOWN' } as unknown as RegisterAction;
    const next = registerReducer(baseState, action);
    expect(next).toBe(baseState);
  });
});
