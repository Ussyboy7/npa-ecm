import { nanoid } from 'nanoid';
import { logError } from '@/lib/client-logger';
import type { User } from './npa-structure';
import * as templateApi from './api/templates';
import { hasTokens } from './api-client';
import type { TemplateScope, TemplateType } from './api/templates';
export type { TemplateScope, TemplateType };

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

const deriveContentText = (html: string, text?: string) => {
  if (text && text.trim().length > 0) {
    return text.trim();
  }
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;
let templatesCache: { data: DocumentTemplate[]; timestamp: number } | null = null;
let templatesPromise: Promise<DocumentTemplate[]> | null = null;

export const invalidateTemplatesCache = (): void => {
  templatesCache = null;
};

export const loadTemplates = async (force = false): Promise<DocumentTemplate[]> => {
  if (!hasTokens()) {
    throw new Error('Authentication required to load templates');
  }

  const now = Date.now();
  if (!force && templatesCache && now - templatesCache.timestamp < TEMPLATES_CACHE_TTL_MS) {
    return templatesCache.data;
  }

  if (!force && templatesPromise) {
    return templatesPromise;
  }

  templatesPromise = (async () => {
    try {
      const data = await templateApi.getTemplates({ isActive: true });
      templatesCache = { data, timestamp: Date.now() };
      return data;
    } catch (error: unknown) {
      logError('Failed to load templates from backend:', error);
      throw error;
    } finally {
      templatesPromise = null;
    }
  })();

  return templatesPromise;
};

export const saveTemplate = async (template: DocumentTemplate): Promise<DocumentTemplate> => {
  const updatedTemplate = {
    ...template,
    contentText: deriveContentText(template.contentHtml, template.contentText),
  };

  if (!hasTokens()) {
    throw new Error('Authentication required to save templates');
  }

  try {
    if (template.id && template.id.startsWith('temp_')) {
      const created = await templateApi.createTemplate({
        scope: template.scope,
        scopeId: template.scopeId,
        title: template.title,
        description: template.description,
        contentHtml: template.contentHtml,
        contentText: updatedTemplate.contentText,
        templateType: template.templateType,
        actionType: template.actionType,
        isDefault: template.isDefault,
      });
      invalidateTemplatesCache();
      return created;
    }

    try {
      const updated = await templateApi.updateTemplate(template.id, {
        title: template.title,
        description: template.description,
        contentHtml: template.contentHtml,
        contentText: updatedTemplate.contentText,
        isDefault: template.isDefault,
      });
      invalidateTemplatesCache();
      return updated;
    } catch (_error: unknown) {
      const created = await templateApi.createTemplate({
        scope: template.scope,
        scopeId: template.scopeId,
        title: template.title,
        description: template.description,
        contentHtml: template.contentHtml,
        contentText: updatedTemplate.contentText,
        templateType: template.templateType,
        actionType: template.actionType,
        isDefault: template.isDefault,
      });
      invalidateTemplatesCache();
      return created;
    }
  } catch (error: unknown) {
    logError('Failed to save template to backend:', error);
    throw error;
  }
};

export const createTemplate = async (data: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentTemplate> => {
  const now = new Date().toISOString();
  const template: DocumentTemplate = {
    ...data,
    id: `temp_${nanoid()}`,
    createdAt: now,
    updatedAt: now,
    contentText: deriveContentText(data.contentHtml, data.contentText),
  };
  return saveTemplate(template);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  if (!hasTokens()) {
    throw new Error('Authentication required to delete templates');
  }

  if (id.startsWith('temp_')) {
    return;
  }

  try {
    await templateApi.deleteTemplate(id);
    invalidateTemplatesCache();
  } catch (error: unknown) {
    logError('Failed to delete template from backend:', error);
    throw error;
  }
};

export const getTemplatesByScope = async (scope: TemplateScope, scopeId?: string | null, templateType: TemplateType = 'document'): Promise<DocumentTemplate[]> => {
  const templates = await loadTemplates();
  return templates.filter((template) => {
    if (template.scope !== scope) return false;
    if (template.templateType !== templateType) return false;
    if (scope === 'organization') return true;
    return template.scopeId === (scopeId ?? null);
  });
};

export const getTemplatesForUser = async (user: User, templateType: TemplateType = 'document'): Promise<DocumentTemplate[]> => {
  const templates = await loadTemplates();
  const matches = templates.filter((template) => {
    if (template.templateType !== templateType) return false;
    switch (template.scope) {
      case 'organization':
        return true;
      case 'directorate':
        return user.directorate ? template.scopeId === user.directorate : false;
      case 'division':
        return user.division ? template.scopeId === user.division : false;
      case 'department':
        return user.department ? template.scopeId === user.department : false;
      case 'user':
        return template.scopeId === user.id;
      default:
        return false;
    }
  });

  const orderedScopes: TemplateScope[] = ['organization', 'directorate', 'division', 'department', 'user'];
  return matches.sort((a, b) => orderedScopes.indexOf(a.scope) - orderedScopes.indexOf(b.scope));
};

export const getDefaultTemplateForUser = async (user: User, templateType: TemplateType = 'document'): Promise<DocumentTemplate | undefined> => {
  const templates = await getTemplatesForUser(user, templateType);
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
