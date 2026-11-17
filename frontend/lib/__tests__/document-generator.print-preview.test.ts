import { beforeEach, describe, expect, it } from 'vitest';
import { generateDocumentHTML } from '../document-generator';
import { resetOrgCache } from '../organization-cache';
import { mapApiMinute } from '../api/correspondence-mappers';
import type { Correspondence } from '../npa-structure';

describe('generateDocumentHTML print preview', () => {
  beforeEach(() => {
    resetOrgCache();
  });

  it('renders minute author names from the minute payload without directory data', () => {
    const minute = mapApiMinute({
      id: 'minute-1',
      correspondence: 'corr-1',
      user: {
        id: 'user-1',
        first_name: 'Amina',
        middle_name: 'Bello',
        last_name: 'Yusuf',
        system_role_name: 'Manager',
      },
      user_id: 'user-1',
      grade_level: 'MSS4',
      action_type: 'minute',
      minute_text: 'Please review the attached document.',
      direction: 'downward',
      step_number: 1,
      timestamp: '2026-11-17T10:00:00Z',
    });

    const correspondence = {
      referenceNumber: 'NPA/PR/001',
      subject: 'Print preview regression',
      divisionId: 'division-not-in-cache',
      receivedDate: '2026-11-17',
      senderName: 'External Sender',
      priority: 'medium',
      status: 'pending',
      direction: 'inward',
    } as unknown as Correspondence;

    const html = generateDocumentHTML({ correspondence, minutes: [minute] });

    expect(html).toContain('Amina Bello Yusuf');
    expect(html).toContain('Manager');
    expect(html).toContain('MSS4');
    expect(html).not.toContain('Unknown');
  });
});
