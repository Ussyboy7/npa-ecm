"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, FileText, Sparkles, Plus, Pencil, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  type DocumentTemplate,
  type DocumentType,
  type DocumentStatus,
} from '@/lib/dms-storage';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logError } from '@/lib/client-logger';

interface DocumentTemplateManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const STATUS_OPTIONS: DocumentStatus[] = ['draft', 'published', 'archived'];
const SENSITIVITY_OPTIONS = ['public', 'internal', 'confidential', 'restricted'] as const;

export const DocumentTemplateManagementDialog = ({
  open,
  onOpenChange,
}: DocumentTemplateManagementDialogProps) => {
  const { currentUser } = useCurrentUser();
  const { divisions, departments } = useOrganization();
  const activeDivisions = useMemo(() => divisions.filter((division) => division.isActive !== false), [divisions]);
  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive !== false), [departments]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('memo');
  const [defaultStatus, setDefaultStatus] = useState<DocumentStatus>('draft');
  const [defaultSensitivity, setDefaultSensitivity] = useState<'public' | 'internal' | 'confidential' | 'restricted'>('internal');
  const [defaultDivisionId, setDefaultDivisionId] = useState<string>('');
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<string>('');
  const [defaultTags, setDefaultTags] = useState<string>('');
  const [templateContent, setTemplateContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filter departments based on selected division
  const filteredDepartments = useMemo(() => {
    if (!defaultDivisionId) return activeDepartments;
    return activeDepartments.filter((dept) => dept.divisionId === defaultDivisionId);
  }, [defaultDivisionId, activeDepartments]);
  
  // Clear department when division changes
  useEffect(() => {
    if (defaultDivisionId && defaultDepartmentId) {
      const dept = activeDepartments.find((d) => d.id === defaultDepartmentId);
      if (dept && dept.divisionId !== defaultDivisionId) {
        setDefaultDepartmentId('');
      }
    }
  }, [defaultDivisionId, defaultDepartmentId, activeDepartments]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    } else {
      resetForm();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const fetched = await getDocumentTemplates({ isActive: undefined }); // Get all templates
      setTemplates(fetched);
    } catch (error) {
      logError('Failed to load document templates', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setDocumentType('memo');
    setDefaultStatus('draft');
    setDefaultSensitivity('internal');
    setDefaultDivisionId('');
    setDefaultDepartmentId('');
    setDefaultTags('');
    setTemplateContent('');
    setIsActive(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setDocumentType(template.documentType);
    setDefaultStatus(template.defaultStatus);
    setDefaultSensitivity(template.defaultSensitivity);
    setDefaultDivisionId(template.defaultDivisionId || '');
    setDefaultDepartmentId(template.defaultDepartmentId || '');
    setDefaultTags(template.defaultTags.join(', '));
    setTemplateContent(template.templateContent || '');
    setIsActive(template.isActive);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      const tags = defaultTags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (editingTemplate) {
        await updateDocumentTemplate(editingTemplate.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          documentType,
          defaultStatus,
          defaultSensitivity,
          defaultDivisionId: defaultDivisionId || undefined,
          defaultDepartmentId: defaultDepartmentId || undefined,
          defaultTags: tags,
          templateContent: templateContent.trim() || undefined,
          isActive,
        });
        toast.success('Template updated');
      } else {
        await createDocumentTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          documentType,
          defaultStatus,
          defaultSensitivity,
          defaultDivisionId: defaultDivisionId || undefined,
          defaultDepartmentId: defaultDepartmentId || undefined,
          defaultTags: tags,
          templateContent: templateContent.trim() || undefined,
          isActive,
        });
        toast.success('Template created');
      }
      
      await loadTemplates();
      resetForm();
    } catch (error) {
      logError('Failed to save template', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setDeleting(true);
    try {
      await deleteDocumentTemplate(templateId);
      toast.success('Template deleted');
      await loadTemplates();
      setShowDeleteConfirm(null);
    } catch (error) {
      logError('Failed to delete template', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6" aria-label="Manage document templates">
          <DialogHeader>
            <DialogTitle>Manage Document Templates</DialogTitle>
            <DialogDescription>
              Create and manage document templates with predefined metadata and structure.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Template List */}
            <div className="space-y-4 order-2 lg:order-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Templates</h3>
                <Button
                  size="sm"
                  onClick={resetForm}
                  variant="outline"
                  aria-label="Create new template"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm mt-2">Create your first template to get started.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          editingTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleEdit(template)}
                        role="button"
                        aria-label={`Edit template: ${template.name}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleEdit(template);
                          }
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                {template.name}
                              </CardTitle>
                              {template.description && (
                                <CardDescription className="text-xs mt-1">
                                  {template.description}
                                </CardDescription>
                              )}
                            </div>
                            {!template.isActive && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1 text-xs">
                            <Badge variant="outline">{template.documentType}</Badge>
                            <Badge variant="outline">{template.defaultStatus}</Badge>
                            <Badge variant="outline">{template.usageCount} uses</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Template Form */}
            <div className="space-y-4">
              <h3 className="font-semibold">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name" className="mb-2 block">
                      Template Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="template-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Standard Memo Template"
                      aria-label="Template name"
                      aria-required="true"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-description" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="template-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Template description"
                      rows={2}
                      aria-label="Template description"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="template-document-type" className="mb-2 block">
                        Document Type
                      </Label>
                      <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                        <SelectTrigger id="template-document-type" aria-label="Document type">
                          <SelectValue />
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

                    <div>
                      <Label htmlFor="template-default-status" className="mb-2 block">
                        Default Status
                      </Label>
                      <Select value={defaultStatus} onValueChange={(v) => setDefaultStatus(v as DocumentStatus)}>
                        <SelectTrigger id="template-default-status" aria-label="Default status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            <div className="flex flex-col">
                              <span>Draft</span>
                              <span className="text-xs text-muted-foreground">Work in progress • Not published</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="published">
                            <div className="flex flex-col">
                              <span>Published</span>
                              <span className="text-xs text-muted-foreground">Finalized and available</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="archived">
                            <div className="flex flex-col">
                              <span>Archived</span>
                              <span className="text-xs text-muted-foreground">No longer active</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="template-default-sensitivity" className="mb-2 block">
                        Default Sensitivity
                      </Label>
                      <Select value={defaultSensitivity} onValueChange={(v) => setDefaultSensitivity(v as typeof defaultSensitivity)}>
                        <SelectTrigger id="template-default-sensitivity" aria-label="Default sensitivity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex flex-col">
                              <span>Public</span>
                              <span className="text-xs text-muted-foreground">All authenticated users • May be shareable externally</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="internal">
                            <div className="flex flex-col">
                              <span>Internal</span>
                              <span className="text-xs text-muted-foreground">All authenticated users • Internal use only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="confidential">
                            <div className="flex flex-col">
                              <span>Confidential</span>
                              <span className="text-xs text-muted-foreground">MSS2+ (MSS2, MSS3, MSS4, MSS5, MSS1, EDCS, MDCS)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="restricted">
                            <div className="flex flex-col">
                              <span>Restricted</span>
                              <span className="text-xs text-muted-foreground">MSS1, EDCS, MDCS only</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {defaultSensitivity === 'public' && (
                        <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs mt-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-blue-700 dark:text-blue-300">Accessible to all authenticated users. Suitable for documents that may be shared externally.</p>
                        </div>
                      )}
                      {defaultSensitivity === 'internal' && (
                        <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-xs mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-green-700 dark:text-green-300">Accessible to all authenticated users. For internal organizational use only.</p>
                        </div>
                      )}
                      {defaultSensitivity === 'confidential' && (
                        <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs mt-2">
                          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                          <p className="text-warning/90">Requires MSS2 or higher grade level access.</p>
                        </div>
                      )}
                      {defaultSensitivity === 'restricted' && (
                        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs mt-2">
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-destructive/90">Highest security level. Only accessible to top management (MSS1, EDCS, MDCS).</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id="template-active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        aria-label="Template active status"
                      />
                      <Label htmlFor="template-active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="template-default-division" className="mb-2 block">
                        Default Division
                      </Label>
                      <Select value={defaultDivisionId || '__none__'} onValueChange={(v) => {
                        setDefaultDivisionId(v === '__none__' ? '' : v);
                        // Clear department when division changes
                        if (v === '__none__') {
                          setDefaultDepartmentId('');
                        } else {
                          if (defaultDepartmentId) {
                            const dept = activeDepartments.find((d) => d.id === defaultDepartmentId);
                            if (dept && dept.divisionId !== v) {
                              setDefaultDepartmentId('');
                            }
                          }
                        }
                      }}>
                        <SelectTrigger id="template-default-division" aria-label="Default division">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {activeDivisions.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="template-default-department" className="mb-2 block">
                        Default Department
                      </Label>
                      <Select value={defaultDepartmentId || '__none__'} onValueChange={(v) => setDefaultDepartmentId(v === '__none__' ? '' : v)} disabled={!defaultDivisionId}>
                        <SelectTrigger id="template-default-department" aria-label="Default department">
                          <SelectValue placeholder={defaultDivisionId ? "None" : "Select division first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {filteredDepartments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!defaultDivisionId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Select a division first to choose a department
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template-default-tags" className="mb-2 block">
                      Default Tags (comma-separated)
                    </Label>
                    <Input
                      id="template-default-tags"
                      value={defaultTags}
                      onChange={(e) => setDefaultTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      aria-label="Default tags"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-content" className="mb-2 block">
                      Template Content (HTML/Markdown)
                    </Label>
                    <Textarea
                      id="template-content"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Enter template content structure..."
                      rows={8}
                      className="font-mono text-xs"
                      aria-label="Template content"
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || saving}
                  className="flex-1"
                  aria-label={editingTemplate ? "Update template" : "Create template"}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingTemplate ? (
                    'Update Template'
                  ) : (
                    'Create Template'
                  )}
                </Button>
                {editingTemplate && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(editingTemplate.id)}
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={resetForm}
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} aria-label="Close dialog" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent aria-label="Confirm template deletion">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. Documents created from this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel aria-label="Cancel deletion">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Confirm template deletion"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

