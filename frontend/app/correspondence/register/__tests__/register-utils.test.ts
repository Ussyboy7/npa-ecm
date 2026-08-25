import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/utils', () => ({
  generateUUID: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import {
  generateReferenceNumber,
  validateStep,
  validateFormData,
  calculateCompletionPercentage,
  isValidEmail,
  validateFile,
  createInitialFormData,
} from '../register-utils';

describe('generateReferenceNumber', () => {
  it('returns empty string — server generates HQ/<tier>/<division>/<dept>/<seq>', () => {
    const ref = generateReferenceNumber();
    expect(ref).toBe("");
  });
});

describe('isValidEmail', () => {
  it('returns true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
  });

  it('returns false for invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('validateFile', () => {
  it('returns true for valid file', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file)).toBe(true);
  });

  it('returns false for oversized file', () => {
    const file = new File(['test'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 40 * 1024 * 1024 });
    expect(validateFile(file)).toBe(false);
  });

  it('returns false for disallowed file type', () => {
    const file = new File(['test'], 'file.exe', { type: 'application/x-msdownload' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file)).toBe(false);
  });

  it('returns true for allowed file types', () => {
    const types = ['doc', 'docx'];
    for (const ext of types) {
      const file = new File(['test'], `file.${ext}`, { type: 'application/msword' });
      Object.defineProperty(file, 'size', { value: 1024 });
      expect(validateFile(file)).toBe(true);
    }
  });
});

describe('validateStep', () => {
  const baseFormData = createInitialFormData();

  it('validates basics step for inward flow', () => {
    const errors = validateStep('basics', { ...baseFormData, subject: '', owningOfficeId: '' }, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.subject).toBe('Subject is required');
    expect(errors.owningOfficeId).toBe('Please select an owning office');
  });

  it('validates basics step requires receivedDate for inward', () => {
    const errors = validateStep('basics', { ...baseFormData, receivedDate: '' }, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.receivedDate).toBe('Date received is required');
  });

  it('validates basics step requires letterDate and dispatchDate for outward', () => {
    const errors = validateStep('basics', baseFormData, 'outward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.letterDate).toBe('Letter date is required');
    expect(errors.dispatchDate).toBe('Dispatch date is required');
  });

  it('returns no errors for valid basics step', () => {
    const validData = {
      ...baseFormData,
      subject: 'Test',
      owningOfficeId: 'office-1',
      receivedDate: '2025-03-01',
    };
    const errors = validateStep('basics', validData, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates sender step for inward requires senderOrganization', () => {
    const errors = validateStep('sender', baseFormData, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.senderOrganization).toBe('Sender organization/private entity is required');
  });

  it('validates sender step for outward requires recipientName', () => {
    const errors = validateStep('sender', baseFormData, 'outward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.recipientName).toBe('Recipient name is required');
  });

  it('validates email in sender step', () => {
    const errors = validateStep('sender', { ...baseFormData, senderEmail: 'invalid' }, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.senderEmail).toBe('Please enter a valid email address');
  });

  it('validates routing step requires assignTo', () => {
    const errors = validateStep('routing', baseFormData, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.assignTo).toBe('Please assign to an executive');
  });

  it('validates routing step requires distribution for outward', () => {
    const errors = validateStep('routing', baseFormData, 'outward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.distribution).toBe('Select at least one directorate, division, or department');
  });

  it('validates documents step requires files', () => {
    const errors = validateStep('documents', baseFormData, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.documentFiles).toBe('Please upload or select at least one source document');
  });

  it('documents step passes with files', () => {
    const errors = validateStep('documents', baseFormData, 'inward', [new File([''], 'x.pdf')], {
      directorates: [], divisions: [], departments: [],
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('validateFormData', () => {
  const base = createInitialFormData();

  it('returns errors for empty form', () => {
    const errors = validateFormData(base, 'inward', [], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.subject).toBe('Subject is required');
    expect(errors.assignTo).toBe('Please assign to an executive');
    expect(errors.owningOfficeId).toBe('Please select an owning office');
    expect(errors.documentFiles).toBe('Please upload or select at least one source document');
  });

  it('requires senderOrganization for inward', () => {
    const errors = validateFormData(base, 'inward', [new File([''], 'x.pdf')], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.senderOrganization).toBe('Sender organization/private entity is required');
  });

  it('requires recipientName and distribution for outward', () => {
    const errors = validateFormData(base, 'outward', [new File([''], 'x.pdf')], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.recipientName).toBe('Recipient name is required');
    expect(errors.dispatchDate).toBe('Dispatch date is required');
    expect(errors.letterDate).toBe('Letter date is required');
    expect(errors.distribution).toBe('Select at least one directorate, division, or department');
  });

  it('validates email addresses', () => {
    const data = { ...base, senderEmail: 'bad', recipientEmail: 'also-bad' };
    const errors = validateFormData(data, 'inward', [new File([''], 'x.pdf')], {
      directorates: [], divisions: [], departments: [],
    });
    expect(errors.senderEmail).toBe('Please enter a valid email address');
    expect(errors.recipientEmail).toBe('Please enter a valid email address');
  });

  it('passes for fully valid inward data', () => {
    const valid = {
      ...base,
      subject: 'Test',
      assignTo: 'user-1',
      owningOfficeId: 'office-1',
      senderOrganization: 'Org',
      receivedDate: '2025-03-01',
    };
    const errors = validateFormData(valid, 'inward', [new File([''], 'x.pdf')], {
      directorates: [], divisions: [], departments: [],
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('calculateCompletionPercentage', () => {
  const base = createInitialFormData();

  it('returns partial for empty inward form (receivedDate is pre-filled)', () => {
    const pct = calculateCompletionPercentage(base, 'inward', []);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(50);
  });

  it('returns 100% for complete inward form', () => {
    const complete = {
      ...base,
      subject: 'Test',
      senderOrganization: 'Org',
      assignTo: 'user-1',
      owningOfficeId: 'office-1',
      receivedDate: '2025-03-01',
    };
    expect(calculateCompletionPercentage(complete, 'inward', [new File([''], 'x.pdf')])).toBe(100);
  });

  it('returns partial for mid-completion inward form', () => {
    const partial = {
      ...base,
      subject: 'Test',
      assignTo: 'user-1',
      owningOfficeId: 'office-1',
      receivedDate: '2025-03-01',
    };
    expect(calculateCompletionPercentage(partial, 'inward', [new File([''], 'x.pdf')])).toBe(83);
  });

  it('returns 0% for empty outward form', () => {
    expect(calculateCompletionPercentage(base, 'outward', [])).toBe(0);
  });

  it('returns 100% for complete outward form', () => {
    const complete = {
      ...base,
      subject: 'Test',
      senderOrganization: 'Org',
      assignTo: 'user-1',
      owningOfficeId: 'office-1',
      recipientName: 'Recipient',
      dispatchDate: '2025-03-01',
      letterDate: '2025-02-28',
    };
    expect(calculateCompletionPercentage(complete, 'outward', [new File([''], 'x.pdf')])).toBe(100);
  });
});
