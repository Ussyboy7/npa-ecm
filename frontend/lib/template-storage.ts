import { nanoid } from 'nanoid';
import { getFromStorage, saveToStorage } from './storage';
import { DIRECTORATES, DIVISIONS, DEPARTMENTS, type User } from './npa-structure';

export type TemplateScope = 'organization' | 'directorate' | 'division' | 'department' | 'user';

export type TemplateType = 'document' | 'minute';

export type DocumentTemplate = {
  id: string;
  scope: TemplateScope;
  scopeId: string | null;
  title: string;
  description?: string;
  contentHtml: string;
  contentText?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  templateType: TemplateType;
  actionType?: 'minute' | 'approve' | 'any';
};

export type TemplateStorage = {
  templates: DocumentTemplate[];
};

const STORAGE_KEY = 'npa-dms-templates';
const SEEDED_KEY = 'npa-dms-templates-seeded-v2';

const ensureStorage = (): TemplateStorage => {
  const existing = getFromStorage<TemplateStorage>(STORAGE_KEY);
  if (!existing) {
    const empty: TemplateStorage = { templates: [] };
    saveToStorage(STORAGE_KEY, empty);
    return empty;
  }
  return existing;
};

const persist = (storage: TemplateStorage) => {
  saveToStorage(STORAGE_KEY, storage);
};

const buildBaseTemplate = (heading: string, subtitle: string, body?: string) => `
  <section style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2933;">
    <header style="border-bottom: 2px solid #004aad; padding-bottom: 12px; margin-bottom: 24px;">
      <h1 style="margin: 0; font-size: 26px; color: #004aad;">${heading}</h1>
      <p style="margin: 4px 0 0; font-size: 15px; color: #64748b;">${subtitle}</p>
    </header>
    <section>
      ${
        body ??
        `<p>Dear Sir/Madam,</p>
         <p>Kindly find the details of the document below. Update this section with the relevant content for your communication.</p>
         <h2 style="font-size: 18px; color: #0f172a; margin-top: 24px;">Key Points</h2>
         <ul style="margin: 12px 0 24px 20px;">
           <li>Background and justification.</li>
           <li>Action items and responsibilities.</li>
           <li>Timelines and next steps.</li>
         </ul>
         <p>Thank you.</p>`
      }
    </section>
    <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
      <p><strong>Prepared by:</strong> _________________________</p>
      <p><strong>Reviewed by:</strong> _________________________</p>
      <p><strong>Date:</strong> _________________________</p>
    </footer>
  </section>
`;

const buildMinuteTemplate = (title: string, body: string) => ({
  contentHtml: `<p>${body}</p>`,
  contentText: body,
  title,
});

const deriveContentText = (html: string, text?: string) => {
  if (text && text.trim().length > 0) {
    return text.trim();
  }
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const templatesMatch = (a: DocumentTemplate, b: DocumentTemplate) => {
  return (
    a.scope === b.scope &&
    (a.scopeId ?? null) === (b.scopeId ?? null) &&
    a.templateType === b.templateType &&
    a.title.trim().toLowerCase() === b.title.trim().toLowerCase()
  );
};

const ensureTemplateEntry = (storage: TemplateStorage, template: DocumentTemplate) => {
  const exists = storage.templates.some((existing) => templatesMatch(existing, template));
  if (exists) {
    return false;
  }
  storage.templates.push(template);
  return true;
};

const seedTemplates = () => {
  if (typeof window === 'undefined') return;

  const storage = ensureStorage();
  const now = new Date().toISOString();
  let updated = false;

  if (!localStorage.getItem(SEEDED_KEY)) {
    const orgContentHtml = buildBaseTemplate('Nigerian Ports Authority', 'Official Correspondence Template');
    updated =
      ensureTemplateEntry(storage, {
        id: nanoid(),
        scope: 'organization',
        scopeId: null,
        title: 'Corporate Memorandum',
        description: 'Baseline template for NPA official memoranda across all directorates.',
        contentHtml: orgContentHtml,
        contentText: deriveContentText(orgContentHtml),
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: now,
        updatedAt: now,
        isDefault: true,
        templateType: 'document',
      }) || updated;

    DIRECTORATES.forEach((directorate) => {
      const contentHtml = buildBaseTemplate(
        directorate.name,
        `Directorate Briefing - ${directorate.shortName ?? directorate.name}`,
      );
      updated =
        ensureTemplateEntry(storage, {
          id: nanoid(),
          scope: 'directorate',
          scopeId: directorate.id,
          title: `${directorate.name} Briefing Note`,
          description: `Default template for documents issued by ${directorate.name}.`,
          contentHtml,
          contentText: deriveContentText(contentHtml),
          createdBy: 'system',
          updatedBy: 'system',
          createdAt: now,
          updatedAt: now,
          isDefault: true,
          templateType: 'document',
        }) || updated;
    });

    DIVISIONS.forEach((division) => {
      const contentHtml = buildBaseTemplate(
        division.name,
        `${division.shortName ?? division.name} Division - Official Report`,
      );
      updated =
        ensureTemplateEntry(storage, {
          id: nanoid(),
          scope: 'division',
          scopeId: division.id,
          title: `${division.name} Division Report`,
          description: `Standard reporting template for the ${division.name} division.`,
          contentHtml,
          contentText: deriveContentText(contentHtml),
          createdBy: 'system',
          updatedBy: 'system',
          createdAt: now,
          updatedAt: now,
          isDefault: true,
          templateType: 'document',
        }) || updated;
    });

    DEPARTMENTS.forEach((department) => {
      const contentHtml = buildBaseTemplate(
        department.name,
        `${department.shortName ?? department.name} Department Memo`,
      );
      updated =
        ensureTemplateEntry(storage, {
          id: nanoid(),
          scope: 'department',
          scopeId: department.id,
          title: `${department.name} Department Memo`,
          description: `Template for departmental communications within ${department.name}.`,
          contentHtml,
          contentText: deriveContentText(contentHtml),
          createdBy: 'system',
          updatedBy: 'system',
          createdAt: now,
          updatedAt: now,
          isDefault: true,
          templateType: 'document',
        }) || updated;
    });

    localStorage.setItem(SEEDED_KEY, 'true');
  }

  const minuteTemplates: Array<{
    scope: TemplateScope;
    scopeId: string | null;
    title: string;
    description: string;
    content: string;
    actionType: 'minute' | 'approve' | 'any';
  }> = [
    {
      scope: 'organization',
      scopeId: null,
      title: 'Please Review & Revert',
      description: 'Standard instruction to review and provide feedback.',
      content: 'Kindly review the attached correspondence and revert with your input within 48 hours.',
      actionType: 'any',
    },
    {
      scope: 'organization',
      scopeId: null,
      title: 'For Immediate Action',
      description: 'Escalation minute for urgent execution.',
      content: 'Please treat as urgent and confirm completion before close of business.',
      actionType: 'minute',
    },
  {
    scope: 'organization',
    scopeId: null,
    title: 'Approval Granted with Conditions',
    description: 'Approve the correspondence while highlighting follow-up expectations.',
    content:
      'Approval granted. Ensure all outlined conditions are met and provide a status update within five (5) working days.',
    actionType: 'approve',
  },
  {
    scope: 'organization',
    scopeId: null,
    title: 'Request Additional Documentation',
    description: 'Ask the originating department to attach missing documents before further action.',
    content:
      'Kindly attach the supporting documents referenced in the memo and revert for further processing within 24 hours.',
    actionType: 'minute',
  },
  {
    scope: 'organization',
    scopeId: null,
    title: 'Acknowledged – In Progress',
    description: 'Let the sender know the request has been received and assigned.',
    content:
      'Acknowledged. The matter is receiving attention. Assigned team to revert with progress update by close of business tomorrow.',
    actionType: 'any',
  },
  {
    scope: 'organization',
    scopeId: null,
    title: 'Completed – Close Out',
    description: 'Communicate that all required actions have been completed.',
    content:
      'All required actions on this correspondence are complete. Please close out the ticket and archive the supporting documents.',
    actionType: 'approve',
  },
    {
      scope: 'directorate',
      scopeId: 'dir-edfa',
      title: 'Finance Clarification Request',
      description: 'Minute requesting clarification on financial matters.',
      content: 'Provide clarifications on the budget variance highlighted and advise on remedial steps.',
      actionType: 'any',
    },
    {
      scope: 'division',
      scopeId: 'div-ict',
      title: 'ICT Follow-up',
      description: 'Minute to ICT division for system-related follow-up.',
      content: 'ICT to assess the system impact and revert with a remediation plan.',
      actionType: 'minute',
    },
  ];

  minuteTemplates.forEach((template) => {
    const body = buildMinuteTemplate(template.title, template.content);
    updated =
      ensureTemplateEntry(storage, {
        id: nanoid(),
        scope: template.scope,
        scopeId: template.scopeId,
        title: template.title,
        description: template.description,
        contentHtml: body.contentHtml,
        contentText: body.contentText,
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: now,
        updatedAt: now,
        isDefault: true,
        templateType: 'minute',
        actionType: template.actionType,
      }) || updated;
  });

  if (updated) {
    persist(storage);
  }
};

export const initializeTemplates = () => {
  seedTemplates();
};

export const loadTemplates = (): DocumentTemplate[] => {
  const storage = ensureStorage();
  return storage.templates;
};

export const saveTemplate = (template: DocumentTemplate) => {
  const storage = ensureStorage();
  const index = storage.templates.findIndex((t) => t.id === template.id);
  if (index >= 0) {
    storage.templates[index] = {
      ...template,
      contentText: deriveContentText(template.contentHtml, template.contentText),
    };
  } else {
    storage.templates.push({
      ...template,
      contentText: deriveContentText(template.contentHtml, template.contentText),
    });
  }
  persist(storage);
  return template;
};

export const createTemplate = (data: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const template: DocumentTemplate = {
    ...data,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    contentText: deriveContentText(data.contentHtml, data.contentText),
  };
  return saveTemplate(template);
};

export const deleteTemplate = (id: string) => {
  const storage = ensureStorage();
  storage.templates = storage.templates.filter((template) => template.id !== id);
  persist(storage);
};

export const getTemplatesByScope = (scope: TemplateScope, scopeId?: string | null, templateType: TemplateType = 'document') => {
  const templates = loadTemplates();
  return templates.filter((template) => {
    if (template.scope !== scope) return false;
    if (template.templateType !== templateType) return false;
    if (scope === 'organization') return true;
    return template.scopeId === (scopeId ?? null);
  });
};

export const getTemplatesForUser = (user: User, templateType: TemplateType = 'document') => {
  const templates = loadTemplates();
  const matches = templates.filter((template) => {
    if (template.templateType !== templateType) return false;
    switch (template.scope) {
      case 'organization':
        return true;
      case 'directorate':
        return template.scopeId === user.directorate;
      case 'division':
        return template.scopeId === user.division;
      case 'department':
        return template.scopeId === user.department;
      case 'user':
        return template.scopeId === user.id;
      default:
        return false;
    }
  });

  const orderedScopes: TemplateScope[] = ['organization', 'directorate', 'division', 'department', 'user'];
  return matches.sort((a, b) => orderedScopes.indexOf(a.scope) - orderedScopes.indexOf(b.scope));
};

export const getDefaultTemplateForUser = (user: User, templateType: TemplateType = 'document') => {
  const templates = getTemplatesForUser(user, templateType);
  const department = templates.find((template) => template.scope === 'department' && template.isDefault);
  if (department) return department;
  const division = templates.find((template) => template.scope === 'division' && template.isDefault);
  if (division) return division;
  const directorate = templates.find((template) => template.scope === 'directorate' && template.isDefault);
  if (directorate) return directorate;
  const organization = templates.find((template) => template.scope === 'organization' && template.isDefault);
  if (organization) return organization;
  return templates[templates.length - 1];
};

export const upsertTemplate = (params: {
  scope: TemplateScope;
  scopeId: string | null;
  title: string;
  description?: string;
  contentHtml: string;
  contentText?: string;
  userId: string;
  isDefault?: boolean;
  templateType?: TemplateType;
  actionType?: 'minute' | 'approve' | 'any';
}) => {
  const storage = ensureStorage();
  const now = new Date().toISOString();
  const existing = storage.templates.find(
    (template) =>
      template.scope === params.scope &&
      template.scopeId === params.scopeId &&
      template.isDefault &&
      template.templateType === (params.templateType ?? 'document'),
  );

  const template: DocumentTemplate = existing
    ? {
        ...existing,
        title: params.title,
        description: params.description,
        contentHtml: params.contentHtml,
        contentText: deriveContentText(params.contentHtml, params.contentText ?? existing.contentText),
        updatedAt: now,
        updatedBy: params.userId,
        isDefault: params.isDefault ?? existing.isDefault,
        templateType: params.templateType ?? existing.templateType,
        actionType: params.actionType ?? existing.actionType,
      }
    : {
        id: nanoid(),
        scope: params.scope,
        scopeId: params.scopeId,
        title: params.title,
        description: params.description,
        contentHtml: params.contentHtml,
        contentText: deriveContentText(params.contentHtml, params.contentText),
        createdAt: now,
        updatedAt: now,
        createdBy: params.userId,
        updatedBy: params.userId,
        isDefault: params.isDefault ?? true,
        templateType: params.templateType ?? 'document',
        actionType: params.actionType,
      };

  storage.templates = storage.templates.filter((t) => t.id !== template.id);
  storage.templates.push(template);
  persist(storage);
  return template;
};
