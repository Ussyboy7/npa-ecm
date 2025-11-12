"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  createDocument,
  createDocumentVersion,
  type DocumentRecord,
  type DocumentType,
  type DocumentStatus,
  type DocumentSensitivity,
} from '@/lib/dms-storage';
import type { User } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { RichTextEditor } from './RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  initializeTemplates,
  getTemplatesForUser,
  getDefaultTemplateForUser,
  createTemplate as createTemplateRecord,
  type DocumentTemplate,
} from '@/lib/template-storage';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];
const MAX_FILE_SIZE_MB = 10;

const sensitivityLabel = (value: DocumentSensitivity) => {
  switch (value) {
    case 'public':
      return 'Public';
    case 'internal':
      return 'Internal';
    case 'confidential':
      return 'Confidential';
    case 'restricted':
      return 'Restricted';
    default:
      return value;
  }
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to read file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'version';
  currentUser: User;
  document?: DocumentRecord;
  onComplete: (document: DocumentRecord) => void;
}

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  mode,
  currentUser,
  document,
  onComplete,
}: DocumentUploadDialogProps) => {
  const { divisions, departments } = useOrganization();
  const activeDivisions = useMemo(() => divisions.filter((division) => division.isActive !== false), [divisions]);
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive !== false), [departments]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('memo');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [divisionId, setDivisionId] = useState<string | undefined>(currentUser.division);
  const [departmentId, setDepartmentId] = useState<string | undefined>(currentUser.department);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [sensitivity, setSensitivity] = useState<DocumentSensitivity>('internal');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeMode, setComposeMode] = useState(mode === 'create');
  const [editorHtml, setEditorHtml] = useState('');
  const [editorJson, setEditorJson] = useState<any>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!composeMode || !document) return;
    const latest = document.versions[0];
    if (!latest) return;
    if (latest.contentHtml) {
      setEditorHtml(latest.contentHtml);
      setEditorJson(latest.contentJson ?? null);
      setTemplateApplied(true);
    }
  }, [composeMode, document]);

  useEffect(() => {
    if (document) {
      setSensitivity(document.sensitivity ?? 'internal');
    } else {
      setSensitivity('internal');
    }
  }, [document, open]);

  const filteredDepartments = useMemo(() => {
    if (!divisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === divisionId);
  }, [activeDepartments, divisionId]);

  useEffect(() => {
    initializeTemplates();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const available = getTemplatesForUser(currentUser);
    setTemplates(available);
    if (!selectedTemplateId) {
      const defaultTemplate = getDefaultTemplateForUser(currentUser);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [currentUser, selectedTemplateId]);

  useEffect(() => {
    if (!composeMode || templateApplied) return;
    if (mode === 'create' && selectedTemplateId && editorHtml.trim().length === 0) {
      const template = templates.find((item) => item.id === selectedTemplateId);
      if (template) {
        setEditorHtml(template.contentHtml);
        setEditorJson(null);
        setTemplateApplied(true);
      }
    }
  }, [composeMode, templateApplied, mode, selectedTemplateId, templates, editorHtml]);

  const resetState = () => {
    setTitle('');
    setDescription('');
    setDocumentType('memo');
    setStatus(mode === 'create' ? 'draft' : document?.status ?? 'draft');
    setDivisionId(currentUser.division);
    setDepartmentId(currentUser.department);
    setReferenceNumber('');
    setTagsInput('');
    setNotes('');
    setFile(null);
    setComposeMode(mode === 'create');
    setEditorHtml('');
    setEditorJson(null);
    setTemplateApplied(false);
    setTemplatePreviewId(null);
    setSensitivity(document?.sensitivity ?? 'internal');
    if (currentUser) {
      const defaultTemplate = getDefaultTemplateForUser(currentUser);
      setSelectedTemplateId(defaultTemplate ? defaultTemplate.id : null);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async () => {
    if (mode === 'create' && !title.trim()) {
      toast.error('A document title is required.');
      return;
    }

    if (composeMode) {
      if (!editorHtml || editorHtml.trim().length === 0) {
        toast.error('Please enter document content.');
        return;
      }
    } else if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (mode === 'create') {
        let fileUrl: string | undefined;
        let fileType = '';
        let fileName = '';
        let fileSize = 0;
        let contentHtml: string | undefined;
        let contentJson: any | undefined;

        if (composeMode) {
          contentHtml = editorHtml;
          contentJson = editorJson;
          fileType = 'text/html';
          fileName = `${title.trim().replace(/\s+/g, '-') || 'document'}.html`;
          const htmlFile = new File([contentHtml], fileName, { type: fileType });
          fileSize = htmlFile.size;
          fileUrl = await fileToDataUrl(htmlFile);
        } else if (file) {
          fileUrl = await fileToDataUrl(file);
          fileType = file.type || 'application/octet-stream';
          fileName = file.name;
          fileSize = file.size;
        }

        if (!fileUrl) {
          toast.error('Failed to prepare file content.');
          return;
        }

        const created = await createDocument(
          {
            title: title.trim(),
            description: description.trim() || undefined,
            documentType,
            status,
            sensitivity,
            divisionId,
            departmentId,
            referenceNumber: referenceNumber.trim() || undefined,
            tags,
            authorId: currentUser.id,
          },
          {
            fileName,
            fileType,
            fileSize,
            fileUrl,
            contentHtml,
            contentJson,
            notes: notes.trim() || undefined,
          },
        );

        onComplete(created);
        toast.success('Document created successfully');
        handleClose(false);
        return;
      }

      if (mode === 'version' && document) {
        let fileUrl: string | undefined;
        let fileType = '';
        let fileName = '';
        let fileSize = 0;
        let contentHtml: string | undefined;
        let contentJson: any | undefined;

        if (composeMode) {
          contentHtml = editorHtml;
          contentJson = editorJson;
          fileType = 'text/html';
          fileName = `${document.title.trim().replace(/\s+/g, '-') || 'document'}-v${document.versions.length + 1}.html`;
          const htmlFile = new File([contentHtml], fileName, { type: fileType });
          fileSize = htmlFile.size;
          fileUrl = await fileToDataUrl(htmlFile);
        } else if (file) {
          fileUrl = await fileToDataUrl(file);
          fileType = file.type || 'application/octet-stream';
          fileName = file.name;
          fileSize = file.size;
        }

        if (!fileUrl) {
          toast.error('Please select or compose a document to upload.');
          return;
        }

        const updated = await createDocumentVersion(document.id, {
          fileName,
          fileType,
          fileSize,
          fileUrl,
          contentHtml,
          contentJson,
          notes: notes.trim() || undefined,
        });

        onComplete(updated);
        toast.success('New version added');
        handleClose(false);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process document. Please try again.';
      toast.error('Failed to process document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = mode === 'create' ? 'Upload New Document' : 'Add New Version';
  const dialogDescription =
    mode === 'create'
      ? 'Create a new document with metadata and content or upload a file.'
      : `Upload a new version for “${document?.title ?? 'Document'}”.`;

  const templateTokens = useMemo(() => {
    if (!currentUser) return [];
    const division = divisionId
      ? activeDivisions.find((div) => div.id === divisionId)
      : currentUser.division
      ? activeDivisions.find((div) => div.id === currentUser.division)
      : undefined;
    const department = departmentId
      ? activeDepartments.find((dept) => dept.id === departmentId)
      : currentUser.department
      ? activeDepartments.find((dept) => dept.id === currentUser.department)
      : undefined;

    const today = new Date();
    const sampleDate = today.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return [
      {
        label: 'Document Title',
        value: '{{document.title}}',
        description: title ? `Sample: ${title}` : 'Replaced with the document title',
      },
      {
        label: 'Document Reference',
        value: '{{document.reference}}',
        description: referenceNumber ? `Sample: ${referenceNumber}` : 'Replaced with the reference number',
      },
      {
        label: 'Prepared By (Name)',
        value: '{{preparedBy.name}}',
        description: currentUser.name,
      },
      {
        label: 'Prepared By (Role)',
        value: '{{preparedBy.role}}',
        description: currentUser.systemRole,
      },
      {
        label: 'Division Name',
        value: '{{division.name}}',
        description: division?.name ?? 'Division linked to this document',
      },
      {
        label: 'Department Name',
        value: '{{department.name}}',
        description: department?.name ?? 'Department linked to this document',
      },
      {
        label: 'Current Date',
        value: '{{date.today}}',
        description: `Sample: ${sampleDate}`,
      },
    ];
  }, [currentUser, divisionId, departmentId, title, referenceNumber]);

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 pb-2">
          {mode === 'create' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="doc-title">Title *</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Port Operations Circular"
                />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sensitivity</Label>
                <Select value={sensitivity} onValueChange={(value) => setSensitivity(value as DocumentSensitivity)}>
                  <SelectTrigger disabled={mode !== 'create'}>
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {sensitivityLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Restricted documents prevent downloads for unauthorized users. Confidential access is limited to managers and above.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={divisionId ?? 'none'}
                  onValueChange={(value) => setDivisionId(value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {activeDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}
                        className="flex flex-col items-start gap-1"
                      >
                        <span className="text-sm font-medium">{division.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {division.code ?? division.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={departmentId ?? 'none'}
                  onValueChange={(value) => setDepartmentId(value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {filteredDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference-number">Reference Number</Label>
                <Input
                  id="reference-number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. NPA/MOPS/2024/045"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the document"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma separated e.g. operations, berth-allocation"
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Content</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={composeMode}
                  onCheckedChange={(checked) => setComposeMode(checked)}
                  disabled={mode === 'version' && !document}
                />
                <span>{composeMode ? 'Compose with editor' : 'Upload file'}</span>
              </div>
            </div>

            {composeMode ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                    <Select value={selectedTemplateId ?? ''} onValueChange={(value) => setSelectedTemplateId(value || null)}>
                      <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selectedTemplateId) {
                          toast.error('Select a template to apply');
                          return;
                        }
                        const template = templates.find((item) => item.id === selectedTemplateId);
                        if (!template) return;
                        if (editorHtml.trim().length > 0 && !templateApplied) {
                          const confirmed = window.confirm('Applying the template will replace existing content. Continue?');
                          if (!confirmed) return;
                        }
                        setEditorHtml(template.contentHtml);
                        setEditorJson(null);
                        setTemplateApplied(true);
                      }}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        if (!selectedTemplateId) {
                          toast.error('Select a template to preview');
                          return;
                        }
                        setTemplatePreviewId(selectedTemplateId);
                      }}
                    >
                      Preview
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!currentUser) {
                        toast.error('Unable to save template without user context');
                        return;
                      }
                      if (!editorHtml || editorHtml.trim().length === 0) {
                        toast.error('Compose content before saving as template');
                        return;
                      }
                      const templateName = window.prompt('Template name', `${currentUser.name.split(' ')[0]} Personal Template`);
                      if (!templateName) return;
                      const created = createTemplateRecord({
                        scope: 'user',
                        scopeId: currentUser.id,
                        title: templateName,
                        description: `Saved by ${currentUser.name}`,
                        contentHtml: editorHtml,
                        templateType: 'document',
                        createdBy: currentUser.id,
                        updatedBy: currentUser.id,
                        isDefault: false,
                      });
                      const refreshed = getTemplatesForUser(currentUser);
                      setTemplates(refreshed);
                      setSelectedTemplateId(created.id);
                      toast.success('Personal template saved');
                    }}
                  >
                    Save as Personal Template
                  </Button>
                </div>
                <RichTextEditor
                  value={editorHtml}
                  onChange={(html, json) => {
                    setEditorHtml(html);
                    setEditorJson(json);
                    setTemplateApplied(true);
                  }}
                  placeholder="Compose your document content..."
                  tokens={templateTokens}
                  maxCharacters={20000}
                />
                <p className="text-xs text-muted-foreground">
                  Compose directly in the system. Use tokens to insert placeholders that can be customised later.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="file">Attach File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.html"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size {MAX_FILE_SIZE_MB}MB. Supported formats: PDF, Word, Excel, PowerPoint, Text, HTML.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Version Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add context about this upload (changes made, approvals, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (!composeMode && !file)}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Document' : 'Upload Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!templatePreviewId} onOpenChange={(open) => !open && setTemplatePreviewId(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>Review the template before applying it to your document.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] border border-border rounded-md p-4 bg-muted/30">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: templates.find((template) => template.id === templatePreviewId)?.contentHtml ?? '',
            }}
          />
        </ScrollArea>
        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setTemplatePreviewId(null)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (!templatePreviewId) return;
              const template = templates.find((item) => item.id === templatePreviewId);
              if (!template) return;
              if (editorHtml.trim().length > 0) {
                const confirmed = window.confirm('Applying the template will replace existing content. Continue?');
                if (!confirmed) return;
              }
              setEditorHtml(template.contentHtml);
              setEditorJson(null);
              setTemplateApplied(true);
              setTemplatePreviewId(null);
              toast.success('Template applied to editor');
            }}
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
};
