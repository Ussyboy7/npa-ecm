import { nanoid } from 'nanoid';
import { getFromStorage, saveToStorage } from './storage';
import { DIVISIONS, DEPARTMENTS, MOCK_USERS, type User } from './npa-structure';

export type DocumentType = 'letter' | 'memo' | 'circular' | 'policy' | 'report' | 'other';
export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
export type PermissionAccess = 'read' | 'write' | 'admin';

export type DocumentPermission = {
  access: PermissionAccess;
  divisionIds?: string[];
  departmentIds?: string[];
  gradeLevels?: string[];
  userIds?: string[];
};

export type ActiveEditor = {
  userId: string;
  since: string;
  note?: string;
};

export type DocumentComment = {
  id: string;
  documentId: string;
  versionId?: string;
  parentId?: string;
  authorId: string;
  content: string;
  createdAt: string;
  resolved?: boolean;
};

export type DocumentDiscussionMessage = {
  id: string;
  documentId: string;
  authorId: string;
  message: string;
  createdAt: string;
};

export type DocumentWorkspace = {
  id: string;
  name: string;
  description?: string;
  color: string;
  memberIds?: string[];
};

export type DocumentAccessLog = {
  id: string;
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'attempted-download';
  timestamp: string;
  sensitivity: DocumentSensitivity;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  contentHtml?: string;
  contentJson?: any;
  contentText?: string;
  ocrText?: string;
  summary?: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  referenceNumber?: string;
  status: DocumentStatus;
  sensitivity: DocumentSensitivity;
  authorId: string;
  divisionId?: string;
  departmentId?: string;
  tags?: string[];
  versions: DocumentVersion[];
  permissions: DocumentPermission[];
  createdAt: string;
  updatedAt: string;
  workspaceIds?: string[];
  activeEditors?: ActiveEditor[];
};

export type DocumentStorage = {
  documents: DocumentRecord[];
  comments: DocumentComment[];
  discussions: DocumentDiscussionMessage[];
  accessLogs: DocumentAccessLog[];
};

const STORAGE_KEY = 'npa-dms';

const defaultDocumentStorage: DocumentStorage = {
  documents: [],
  comments: [],
  discussions: [],
  accessLogs: [],
};

const ensureStorage = (): DocumentStorage => {
  const existing = getFromStorage<DocumentStorage>(STORAGE_KEY);
  if (!existing) {
    saveToStorage(STORAGE_KEY, defaultDocumentStorage);
    return defaultDocumentStorage;
  }
  if (!('comments' in existing)) {
    existing.comments = [];
  }
  if (!('discussions' in existing)) {
    existing.discussions = [];
  }
  if (!('accessLogs' in existing)) {
    existing.accessLogs = [];
  }
  return existing;
};

const updateStorage = (data: DocumentStorage) => {
  saveToStorage(STORAGE_KEY, data);
};

const extractPlainText = (html?: string) => {
  if (!html) return undefined;
  const tmp = globalThis.document ? document.createElement('div') : null;
  if (!tmp) return undefined;
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? undefined;
};

const htmlToDataUrl = (html: string) => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

const generateSummary = (text?: string) => {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (clean.length <= 200) return clean;
  return `${clean.slice(0, 197)}...`;
};

export const DEFAULT_WORKSPACES: DocumentWorkspace[] = [
  {
    id: 'workspace-digital-transformation',
    name: 'Digital Transformation Taskforce',
    description: 'ICT, Procurement, and Engineering joint initiatives.',
    color: '#2563eb',
    memberIds: ['user-gm-ict', 'user-gm-procurement', 'user-gm-engineering'],
  },
  {
    id: 'workspace-budget-oversight',
    name: 'Budget Oversight Committee',
    description: 'Finance, Planning, and MD Office reviews.',
    color: '#7c3aed',
    memberIds: ['user-gm-finance', 'user-gm-csp', 'user-md'],
  },
  {
    id: 'workspace-safety-compliance',
    name: 'HSE Compliance Review',
    description: 'Marine Ops and HSE compliance activities.',
    color: '#16a34a',
    memberIds: ['user-gm-marine', 'user-gm-hse'],
  },
];

export const getDocuments = () => {
  const storage = ensureStorage();
  return storage.documents;
};

export const loadDocuments = () => getDocuments();

export const getDocumentById = (id: string) => {
  const storage = ensureStorage();
  return storage.documents.find((doc) => doc.id === id);
};

export const addDocument = (data: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const storage = ensureStorage();
  const id = nanoid();
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;
  const sensitivity = data.sensitivity ?? 'internal';

  const normalizedVersions = data.versions.map((version, index) => {
    const text = version.contentText ?? extractPlainText(version.contentHtml);
    return {
      ...version,
      id: nanoid(),
      documentId: id,
      versionNumber: index + 1,
      contentText: text,
      summary: version.summary ?? generateSummary(text),
    };
  });

  const newDocument: DocumentRecord = {
    ...data,
    id,
    versions: normalizedVersions,
    createdAt,
    updatedAt,
    sensitivity,
    workspaceIds: data.workspaceIds ?? [],
    activeEditors: [],
  };

  storage.documents.push(newDocument);
  updateStorage(storage);
  return newDocument;
};

export const addDocumentVersion = (
  documentId: string,
  data: Omit<DocumentVersion, 'id' | 'documentId' | 'versionNumber' | 'uploadedAt' | 'contentText' | 'summary' | 'ocrText'>,
) => {
  const storage = ensureStorage();
  const document = storage.documents.find((doc) => doc.id === documentId);
  if (!document) return undefined;

  const text = extractPlainText(data.contentHtml);

  const version: DocumentVersion = {
    id: nanoid(),
    documentId,
    versionNumber: document.versions.length + 1,
    uploadedBy: data.uploadedBy,
    uploadedAt: new Date().toISOString(),
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileUrl: data.fileUrl,
    contentHtml: data.contentHtml,
    contentJson: data.contentJson,
    contentText: text,
    summary: generateSummary(text),
    notes: data.notes,
  };

  document.versions.unshift(version);
  document.updatedAt = version.uploadedAt;
  updateStorage(storage);

  return document;
};

export const updateDocument = (documentId: string, updates: Partial<DocumentRecord>) => {
  const storage = ensureStorage();
  const documentIndex = storage.documents.findIndex((doc) => doc.id === documentId);
  if (documentIndex === -1) return undefined;

  const document = storage.documents[documentIndex];
  storage.documents[documentIndex] = {
    ...document,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  updateStorage(storage);
  return storage.documents[documentIndex];
};

export const updateDocumentMetadata = (
  documentId: string,
  metadata: Partial<Pick<DocumentRecord, 'title' | 'description' | 'status' | 'divisionId' | 'departmentId' | 'tags' | 'referenceNumber'>>,
) => {
  return updateDocument(documentId, metadata);
};

export const updateDocumentWorkspaces = (documentId: string, workspaceIds: string[]) => {
  return updateDocument(documentId, { workspaceIds });
};

export const updateDocumentVersionMeta = (
  documentId: string,
  versionId: string,
  updates: Partial<Pick<DocumentVersion, 'summary' | 'ocrText' | 'contentText'>>,
) => {
  const storage = ensureStorage();
  const documentIndex = storage.documents.findIndex((doc) => doc.id === documentId);
  if (documentIndex === -1) return undefined;
  const doc = storage.documents[documentIndex];
  const versionIndex = doc.versions.findIndex((version) => version.id === versionId);
  if (versionIndex === -1) return undefined;
  const current = doc.versions[versionIndex];
  const updated: DocumentVersion = {
    ...current,
    ...updates,
  };
  doc.versions[versionIndex] = updated;
  doc.updatedAt = new Date().toISOString();
  storage.documents[documentIndex] = doc;
  updateStorage(storage);
  return updated;
};

export const addActiveEditor = (documentId: string, editor: ActiveEditor) => {
  const storage = ensureStorage();
  const document = storage.documents.find((doc) => doc.id === documentId);
  if (!document) return undefined;
  const existing = document.activeEditors ?? [];
  if (!existing.find((item) => item.userId === editor.userId)) {
    document.activeEditors = [...existing, editor];
    document.updatedAt = new Date().toISOString();
    updateStorage(storage);
  }
  return document;
};

export const removeActiveEditor = (documentId: string, userId: string) => {
  const storage = ensureStorage();
  const document = storage.documents.find((doc) => doc.id === documentId);
  if (!document) return undefined;
  document.activeEditors = (document.activeEditors ?? []).filter((editor) => editor.userId !== userId);
  document.updatedAt = new Date().toISOString();
  updateStorage(storage);
  return document;
};

export const getDocumentComments = (documentId: string, versionId?: string) => {
  const storage = ensureStorage();
  return storage.comments.filter((comment) => {
    if (comment.documentId !== documentId) return false;
    if (versionId) {
      return comment.versionId === versionId;
    }
    return true;
  });
};

export const addDocumentComment = (comment: Omit<DocumentComment, 'id' | 'createdAt'>) => {
  const storage = ensureStorage();
  const full: DocumentComment = {
    ...comment,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  storage.comments.push(full);
  updateStorage(storage);
  return full;
};

export const resolveDocumentComment = (commentId: string, resolved: boolean) => {
  const storage = ensureStorage();
  const index = storage.comments.findIndex((comment) => comment.id === commentId);
  if (index === -1) return undefined;
  storage.comments[index] = {
    ...storage.comments[index],
    resolved,
  };
  updateStorage(storage);
  return storage.comments[index];
};

export const deleteDocumentComment = (commentId: string) => {
  const storage = ensureStorage();
  storage.comments = storage.comments.filter((comment) => comment.id !== commentId && comment.parentId !== commentId);
  updateStorage(storage);
};

export const getDiscussionMessages = (documentId: string) => {
  const storage = ensureStorage();
  return storage.discussions.filter((message) => message.documentId === documentId);
};

export const addDiscussionMessage = (message: Omit<DocumentDiscussionMessage, 'id' | 'createdAt'>) => {
  const storage = ensureStorage();
  const record: DocumentDiscussionMessage = {
    ...message,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  storage.discussions.push(record);
  updateStorage(storage);
  return record;
};

export const listWorkspaces = () => DEFAULT_WORKSPACES;

export const logDocumentAccess = (log: Omit<DocumentAccessLog, 'id' | 'timestamp'>) => {
  const storage = ensureStorage();
  storage.accessLogs.push({
    ...log,
    id: nanoid(),
    timestamp: new Date().toISOString(),
  });
  updateStorage(storage);
};

export const getAccessLogsForDocument = (documentId: string, limit?: number) => {
  const storage = ensureStorage();
  const logs = storage.accessLogs
    .filter((log) => log.documentId === documentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (limit) {
    return logs.slice(0, limit);
  }
  return logs;
};

export const isSensitiveAccessAllowed = (document: DocumentRecord, user: User | null) => {
  if (!user) return document.sensitivity === 'public';
  switch (document.sensitivity) {
    case 'public':
      return true;
    case 'internal':
      return true;
    case 'confidential':
      return ['MSS5', 'MSS4', 'MSS3', 'MSS2', 'MSS1', 'EDCS', 'MDCS'].includes(user.gradeLevel);
    case 'restricted':
      return document.authorId === user.id || ['MSS1', 'EDCS', 'MDCS'].includes(user.gradeLevel);
    default:
      return false;
  }
};

const userGradeToPermissionRoles = (user: User): string[] => {
  const grade = user.gradeLevel;
  return [grade];
};

const userHasPermission = (user: User, document: DocumentRecord): boolean => {
  if (user.id === document.authorId) return true;

  const permissions = document.permissions ?? [];
  const userGrades = userGradeToPermissionRoles(user);

  const matchesPermission = permissions.some((permission) => {
    if (permission.userIds?.includes(user.id)) return true;
    if (
      permission.gradeLevels &&
      permission.gradeLevels.some((grade) => userGrades.includes(grade))
    )
      return true;
    if (
      permission.divisionIds &&
      permission.divisionIds.includes(user.division ?? '')
    )
      return true;
    if (
      permission.departmentIds &&
      permission.departmentIds.includes(user.department ?? '')
    )
      return true;

    return permission.access === 'read' && permission.gradeLevels?.includes('All');
  });

  if (matchesPermission) return true;

  if (document.status === 'published') {
    if (
      document.divisionId &&
      user.division &&
      document.divisionId === user.division
    )
      return true;
    if (
      document.departmentId &&
      user.department &&
      document.departmentId === user.department
    )
      return true;
  }

  return document.status === 'published';
};

export const getAccessibleDocumentsForUser = (user: User): DocumentRecord[] => {
  const documents = getDocuments();
  return documents.filter((document) => userHasPermission(user, document));
};

export const getDivisionName = (divisionId?: string): string => {
  if (!divisionId) return 'Unassigned';
  const division = DIVISIONS.find((div) => div.id === divisionId);
  return division ? division.name : 'Unknown division';
};

export const getDepartmentName = (departmentId?: string): string => {
  if (!departmentId) return 'Unassigned';
  const department = DEPARTMENTS.find((dept) => dept.id === departmentId);
  return department ? department.name : 'Unknown department';
};

const DMS_SEEDED_KEY = 'npa-dms-seeded-v1';

type SeedDocumentConfig = {
  title: string;
  description: string;
  documentType: DocumentType;
  status: DocumentStatus;
  sensitivity?: DocumentSensitivity;
  referenceNumber?: string;
  divisionId?: string;
  departmentId?: string;
  tags?: string[];
  authorId: string;
  contentHtml: string;
  notes?: string;
};

const createSeedDocument = (config: SeedDocumentConfig) => {
  const { contentHtml, notes, ...docMeta } = config;

  addDocument({
    ...docMeta,
    sensitivity: config.sensitivity ?? 'internal',
    versions: [
      {
        id: '',
        documentId: '',
        versionNumber: 1,
        fileName: `${config.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'document'}.html`,
        fileType: 'text/html',
        fileSize: contentHtml.length,
        fileUrl: htmlToDataUrl(contentHtml),
        contentHtml,
        contentJson: null,
        contentText: extractPlainText(contentHtml),
        uploadedBy: config.authorId,
        uploadedAt: new Date().toISOString(),
        notes,
      },
    ],
    permissions: [
      {
        access: 'read',
        divisionIds: config.divisionId ? [config.divisionId] : undefined,
        gradeLevels: ['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3'],
      },
      {
        access: 'write',
        userIds: [config.authorId],
      },
    ],
  });
};

export const initializeDmsDocuments = () => {
  if (typeof window === 'undefined') return;

  const storage = ensureStorage();
  if (storage.documents.length > 0 && localStorage.getItem(DMS_SEEDED_KEY)) {
    return;
  }

  const md = MOCK_USERS.find((user) => user.gradeLevel === 'MDCS');
  const edMarine = MOCK_USERS.find((user) => user.division === 'div-marine-operations');
  const gmICT = MOCK_USERS.find((user) => user.division === 'div-ict');
  const agmHR = MOCK_USERS.find((user) => user.department === 'dept-human-resources');

  const now = new Date();

  const documents: SeedDocumentConfig[] = [
    {
      title: 'Port Modernization Roadmap 2025',
      description: 'Strategic memo outlining modernization initiatives across the authority.',
      documentType: 'memo',
      status: 'published',
      sensitivity: 'confidential',
      referenceNumber: 'NPA/MD/OPS/2024/011',
      divisionId: edMarine?.division,
      departmentId: edMarine?.department,
      tags: ['strategy', 'modernization', 'marine'],
      authorId: edMarine?.id ?? md?.id ?? MOCK_USERS[0].id,
      contentHtml: `
        <h2>Overview</h2>
        <p>The modernization roadmap focuses on infrastructure upgrades, digital transformation, and workforce capacity building.</p>
        <h3>Key Initiatives</h3>
        <ul>
          <li>Berth automation and smart monitoring.</li>
          <li>Integrated cargo tracking and analytics.</li>
          <li>Green energy adoption across terminals.</li>
        </ul>
        <p>Directorates are expected to provide quarterly progress reports and align their budgets accordingly.</p>
      `,
      notes: 'Approved by MDCS during EXCO meeting on ' + now.toLocaleDateString('en-US'),
    },
    {
      title: 'Digital Transformation Initiative Charter',
      description: 'Formal charter for the enterprise digital transformation program.',
      documentType: 'policy',
      status: 'draft',
      sensitivity: 'restricted',
      referenceNumber: 'NPA/ICT/DTI/2024/004',
      divisionId: gmICT?.division,
      departmentId: gmICT?.department,
      tags: ['digital', 'charter', 'ict'],
      authorId: gmICT?.id ?? md?.id ?? MOCK_USERS[0].id,
      contentHtml: `
        <h2>Mission</h2>
        <p>Deliver a unified digital platform that streamlines correspondence, DMS, and analytics for management oversight.</p>
        <h3>Scope</h3>
        <p>The charter covers workflow automation, secure document signatures, and analytics dashboards.</p>
        <h3>Timeline</h3>
        <p>Phase 1 pilot in Q1 2025 with full rollout by Q4 2025.</p>
      `,
      notes: 'Pending review by ED Corporate Services.',
    },
    {
      title: 'Workforce Training Calendar 2025',
      description: 'Comprehensive training plan for all divisions including technical and management tracks.',
      documentType: 'report',
      status: 'published',
      sensitivity: 'internal',
      referenceNumber: 'NPA/HRD/DEV/2024/019',
      divisionId: agmHR?.division,
      departmentId: agmHR?.department,
      tags: ['hr', 'training', 'capacity'],
      authorId: agmHR?.id ?? md?.id ?? MOCK_USERS[0].id,
      contentHtml: `
        <h2>Training Overview</h2>
        <p>The 2025 calendar prioritizes safety certifications, leadership development, and digital literacy for port operations.</p>
        <h3>Highlights</h3>
        <ol>
          <li>Quarterly safety drills for marine operations.</li>
          <li>Advanced analytics workshops for planning officers.</li>
          <li>Customer service excellence programs across port locations.</li>
        </ol>
        <p>Directors are requested to nominate participants by mid-December 2024.</p>
      `,
      notes: 'Approved for circulation to all divisions.',
    },
  ];

  documents.forEach(createSeedDocument);

  localStorage.setItem(DMS_SEEDED_KEY, 'true');
};
