import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
  hasTokens: () => true,
}));

import { getDocumentComments } from '@/lib/dms-collaboration';
import { mapDocument, mapDocumentVersion } from '@/lib/dms-types';

const apiUser = {
  id: 'user-1',
  first_name: 'Amina',
  middle_name: 'Bello',
  last_name: 'Yusuf',
};

describe('DMS user names from API payloads', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('derives the document author name from the nested author payload', () => {
    const document = mapDocument({
      id: 'doc-1',
      title: 'Test document',
      author: apiUser,
    });

    expect(document.authorId).toBe('user-1');
    expect(document.authorName).toBe('Amina Bello Yusuf');
  });

  it('derives the version uploader name from the nested uploaded_by payload', () => {
    const version = mapDocumentVersion({
      id: 'version-1',
      document: 'doc-1',
      uploaded_by: apiUser,
    });

    expect(version.uploadedBy).toBe('user-1');
    expect(version.uploadedByName).toBe('Amina Bello Yusuf');
  });

  it('derives comment author names from the comments payload', async () => {
    apiFetchMock.mockResolvedValue({
      results: [
        {
          id: 'comment-1',
          document: 'doc-1',
          author: apiUser,
          content: 'Looks good',
        },
      ],
    });

    const comments = await getDocumentComments('doc-1');

    expect(comments[0]?.authorId).toBe('user-1');
    expect(comments[0]?.authorName).toBe('Amina Bello Yusuf');
  });
});
