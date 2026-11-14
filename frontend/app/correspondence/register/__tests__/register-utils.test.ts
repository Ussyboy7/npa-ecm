import { describe, it, expect, vi } from 'vitest';

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
  buildSubmissionFormData,
  getCorrespondenceSourceError,
  getExistingCorrespondenceId,
} from '../register-utils';

const emptyDistributions = { directorates: [], divisions: [], departments: [] };

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
    const errors = validateStep('basics', { ...baseFormData, subject: '', owningOfficeId: '' }, 'inward', [], emptyDistributions);
    expect(errors.subject).toBe('Subject is required');
    expect(errors.owningOfficeId).toBe('Please select an owning office');
  });

  it('validates basics step requires receivedDate for inward', () => {
    const errors = validateStep('basics', { ...baseFormData, receivedDate: '' }, 'inward', [], emptyDistributions);
    expect(errors.receivedDate).toBe('Date received is required');
  });

  it('validates basics step requires letterDate and dispatchDate for outward', () => {
    const errors = validateStep('basics', baseFormData, 'outward', [], emptyDistributions);
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
    const errors = validateStep('basics', validData, 'inward', [], emptyDistributions);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates sender step for inward requires senderOrganization', () => {
    const errors = validateStep('sender', baseFormData, 'inward', [], emptyDistributions);
    expect(errors.senderOrganization).toBe('Sender organization/private entity is required');
  });

  it('validates sender step for outward requires recipientName', () => {
    const errors = validateStep('sender', baseFormData, 'outward', [], emptyDistributions);
    expect(errors.recipientName).toBe('Recipient name is required');
  });

  it('validates sender step requires outward distribution', () => {
    const errors = validateStep('sender', baseFormData, 'outward', [], emptyDistributions);
    expect(errors.distribution).toBe('Select at least one directorate, division, or department');
  });

  it('accepts sender step when outward distribution is selected', () => {
    const errors = validateStep(
      'sender',
      { ...baseFormData, recipientName: 'Recipient' },
      'outward',
      [],
      { directorates: ['dir-1'], divisions: [], departments: [] },
    );
    expect(errors.distribution).toBeUndefined();
  });

  it('requires an explicit source when outward recipient and distribution overlap', () => {
    const errors = validateStep(
      'sender',
      { ...baseFormData, recipientName: 'Recipient' },
      'outward',
      [],
      { directorates: ['dir-1'], divisions: [], departments: [] },
    );
    expect(errors.correspondenceSource).toBe(
      'Choose whether this outward correspondence is internal or external',
    );
    expect(
      getCorrespondenceSourceError(
        { ...baseFormData, recipientName: 'Recipient' },
        'outward',
        { directorates: ['dir-1'], divisions: [], departments: [] },
      ),
    ).toBe('Choose whether this outward correspondence is internal or external');
  });

  it('accepts an explicit internal source for outward correspondence', () => {
    const errors = validateStep(
      'sender',
      { ...baseFormData, recipientName: 'Recipient', correspondenceSource: 'internal' },
      'outward',
      [],
      { directorates: ['dir-1'], divisions: [], departments: [] },
    );
    expect(errors.correspondenceSource).toBeUndefined();
  });

  it('validates email in sender step', () => {
    const errors = validateStep('sender', { ...baseFormData, senderEmail: 'invalid' }, 'inward', [], emptyDistributions);
    expect(errors.senderEmail).toBe('Please enter a valid email address');
  });

  it('validates documents step requires files', () => {
    const errors = validateStep('documents', baseFormData, 'inward', [], emptyDistributions);
    expect(errors.documentFiles).toBe('Please upload or select at least one source document');
  });

  it('documents step passes with files', () => {
    const errors = validateStep('documents', baseFormData, 'inward', [new File([''], 'x.pdf')], emptyDistributions);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('validateFormData', () => {
  const base = createInitialFormData();

  it('returns errors for empty form', () => {
    const errors = validateFormData(base, 'inward', [], emptyDistributions);
    expect(errors.subject).toBe('Subject is required');
    expect(errors.owningOfficeId).toBe('Please select an owning office');
    expect(errors.documentFiles).toBe('Please upload or select at least one source document');
  });

  it('requires senderOrganization for inward', () => {
    const errors = validateFormData(base, 'inward', [new File([''], 'x.pdf')], emptyDistributions);
    expect(errors.senderOrganization).toBe('Sender organization/private entity is required');
  });

  it('requires recipientName and distribution for outward', () => {
    const errors = validateFormData(base, 'outward', [new File([''], 'x.pdf')], emptyDistributions);
    expect(errors.recipientName).toBe('Recipient name is required');
    expect(errors.dispatchDate).toBe('Dispatch date is required');
    expect(errors.letterDate).toBe('Letter date is required');
    expect(errors.distribution).toBe('Select at least one directorate, division, or department');
  });

  it('validates email addresses', () => {
    const data = { ...base, senderEmail: 'bad', recipientEmail: 'also-bad' };
    const errors = validateFormData(data, 'inward', [new File([''], 'x.pdf')], emptyDistributions);
    expect(errors.senderEmail).toBe('Please enter a valid email address');
    expect(errors.recipientEmail).toBe('Please enter a valid email address');
  });

  it('passes for fully valid inward data', () => {
    const valid = {
      ...base,
      subject: 'Test',
      owningOfficeId: 'office-1',
      senderOrganization: 'Org',
      receivedDate: '2025-03-01',
    };
    const errors = validateFormData(valid, 'inward', [new File([''], 'x.pdf')], emptyDistributions);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('physical custody registration', () => {
  const base = createInitialFormData();

  it('does not ask for a custodian office when a physical copy is selected', () => {
    const errors = validateStep(
      'basics',
      { ...base, subject: 'Test', owningOfficeId: 'office-1', hasPhysicalCopy: true },
      'inward',
      [],
      emptyDistributions,
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('submits physical tracking without a custodian or shelf field', () => {
    const form = buildSubmissionFormData(
      {
        ...base,
        subject: 'Test',
        owningOfficeId: 'office-1',
        hasPhysicalCopy: true,
      },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('has_physical_copy')).toBe('true');
    expect(form.get('physical_custodian_office')).toBeNull();
    expect(form.get('physical_location')).toBeNull();
  });

  it('registers into the owning office queue without an initial approver', () => {
    const form = buildSubmissionFormData(
      { ...base, subject: 'Test', owningOfficeId: 'office-1' },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('current_approver_id')).toBeNull();
    expect(form.get('current_office')).toBe('office-1');
    expect(form.get('owning_office')).toBe('office-1');
  });

  it('submits the explicit internal/external source for outward correspondence', () => {
    const form = buildSubmissionFormData(
      {
        ...base,
        subject: 'Test',
        owningOfficeId: 'office-1',
        recipientName: 'Recipient',
        correspondenceSource: 'external',
      },
      'outward',
      [],
      { directorates: ['dir-1'], divisions: [], departments: [] },
    );
    expect(form.get('source')).toBe('external');
  });

  it('uses an inward document reference as the incoming reference', () => {
    const form = buildSubmissionFormData(
      {
        ...base,
        subject: 'Test',
        owningOfficeId: 'office-1',
        referenceNumber: "HQ/AGM/SA&DM/AD/001",
        senderReference: 'SA&DM/AD/2026/017',
      },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('reference_number')).toBe('SA&DM/AD/2026/017');
    expect(form.get('sender_reference')).toBe('SA&DM/AD/2026/017');
  });

  it('keeps the generated outgoing reference when a sender reference is supplied', () => {
    const form = buildSubmissionFormData(
      {
        ...base,
        subject: 'Test',
        owningOfficeId: 'office-1',
        referenceNumber: "HQ/AGM/SA&DM/AD/001",
        senderReference: 'EXTERNAL/OUT/2026/1',
      },
      'outward',
      [],
      emptyDistributions,
    );
    expect(form.get('reference_number')).toBe("HQ/AGM/SA&DM/AD/001");
    expect(form.get('sender_reference')).toBe('EXTERNAL/OUT/2026/1');
  });

  it('submits the selected reference classification code', () => {
    const form = buildSubmissionFormData(
      {
        ...base,
        subject: 'Test',
        owningOfficeId: 'office-1',
        referenceClassificationCode: 'OP',
      },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('reference_classification_code')).toBe('OP');
  });

  it('omits the classification code when no scheme classification is selected', () => {
    const form = buildSubmissionFormData(
      { ...base, subject: 'Test', owningOfficeId: 'office-1' },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('reference_classification_code')).toBeNull();
  });

  it('omits custody ids when no physical copy is declared', () => {
    const form = buildSubmissionFormData(
      { ...base, subject: 'Test', owningOfficeId: 'office-1', hasPhysicalCopy: false },
      'inward',
      [],
      emptyDistributions,
    );
    expect(form.get('has_physical_copy')).toBe('false');
    expect(form.get('physical_custodian_office')).toBeNull();
    expect(form.get('physical_location')).toBeNull();
  });
});

describe('getExistingCorrespondenceId', () => {
  it('reads the existing record id from a duplicate-reference API error', () => {
    const error = {
      body: JSON.stringify({
        error: true,
        message: 'This reference already belongs to an existing correspondence',
        details: { existing_correspondence_id: 'corr-123' },
      }),
    };
    expect(getExistingCorrespondenceId(error)).toBe('corr-123');
  });

  it('returns null for unrelated or malformed errors', () => {
    expect(getExistingCorrespondenceId(new Error('network'))).toBeNull();
    expect(getExistingCorrespondenceId({ body: 'not-json' })).toBeNull();
    expect(
      getExistingCorrespondenceId({ body: JSON.stringify({ details: {} }) })
    ).toBeNull();
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
      owningOfficeId: 'office-1',
      receivedDate: '2025-03-01',
    };
    expect(calculateCompletionPercentage(complete, 'inward', [new File([''], 'x.pdf')])).toBe(100);
  });

  it('returns partial for mid-completion inward form', () => {
    const partial = {
      ...base,
      subject: 'Test',
      owningOfficeId: 'office-1',
      receivedDate: '2025-03-01',
    };
    expect(calculateCompletionPercentage(partial, 'inward', [new File([''], 'x.pdf')])).toBe(80);
  });

  it('returns 0% for empty outward form', () => {
    expect(calculateCompletionPercentage(base, 'outward', [])).toBe(0);
  });

  it('returns 100% for complete outward form', () => {
    const complete = {
      ...base,
      subject: 'Test',
      owningOfficeId: 'office-1',
      recipientName: 'Recipient',
      dispatchDate: '2025-03-01',
      letterDate: '2025-02-28',
    };
    const distributions = { directorates: ['dir-1'], divisions: [], departments: [] };
    expect(
      calculateCompletionPercentage(
        complete,
        'outward',
        [new File([''], 'x.pdf')],
        distributions,
      ),
    ).toBe(100);
  });
});
