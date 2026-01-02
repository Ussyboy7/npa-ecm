"use client";

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, FileText, Sparkles, X } from 'lucide-react';
import {
  getDocumentTemplates,
  createDocumentFromTemplate,
  type DocumentTemplate,
  type DocumentType,
} from '@/lib/dms-storage';
import { useOrganization } from '@/contexts/OrganizationContext';
import { logError } from '@/lib/client-logger';

interface DocumentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: DocumentType;
  onTemplateSelected: (template: DocumentTemplate) => void;
  onCreateDocument?: (templateId: string, title: string) => Promise<void>;
}

export const DocumentTemplateDialog = ({
  open,
  onOpenChange,
  documentType,
  onTemplateSelected,
  onCreateDocument,
}: DocumentTemplateDialogProps) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { divisions, departments } = useOrganization();

  useEffect(() => {
    if (open) {
      loadTemplates();
    } else {
      setSelectedTemplate(null);
      setDocumentTitle('');
    }
  }, [open, documentType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const fetched = await getDocumentTemplates({
        documentType,
        isActive: true,
      });
      setTemplates(fetched);
    } catch (error) {
      logError('Failed to load document templates', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    if (onTemplateSelected) {
      onTemplateSelected(template);
    }
  };

  const handleCreateDocument = async () => {
    if (!selectedTemplate || !documentTitle.trim()) {
      toast.error('Please select a template and enter a document title');
      return;
    }

    if (onCreateDocument) {
      setCreating(true);
      try {
        await onCreateDocument(selectedTemplate.id, documentTitle.trim());
        toast.success('Document created from template');
        onOpenChange(false);
      } catch (error) {
        logError('Failed to create document from template', error);
        toast.error('Failed to create document');
      } finally {
        setCreating(false);
      }
    } else {
      // Just select the template
      onTemplateSelected(selectedTemplate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6" aria-label="Select document template">
        <DialogHeader>
          <DialogTitle>Select Document Template</DialogTitle>
          <DialogDescription>
            Choose a template to create a new document. Templates include predefined metadata and structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates available</p>
              <p className="text-sm mt-2">
                {documentType
                  ? `No templates found for ${documentType} documents.`
                  : 'No active templates found.'}
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelectTemplate(template)}
                      role="button"
                      aria-label={`Select template: ${template.name}`}
                      aria-pressed={selectedTemplate?.id === template.id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectTemplate(template);
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              {template.name}
                            </CardTitle>
                            {template.description && (
                              <CardDescription className="mt-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{template.documentType}</Badge>
                          <Badge variant="outline">{template.defaultStatus}</Badge>
                          <Badge variant="outline">{template.defaultSensitivity}</Badge>
                          {template.usageCount > 0 && (
                            <Badge variant="secondary">
                              Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        {template.defaultTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {template.defaultTags.slice(0, 5).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.defaultTags.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.defaultTags.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {selectedTemplate && onCreateDocument && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label htmlFor="document-title" className="mb-2 block">
                      Document Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="document-title"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="Enter document title"
                      aria-label="Document title"
                      aria-required="true"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} aria-label="Cancel">
            Cancel
          </Button>
          {selectedTemplate && onCreateDocument && (
            <Button
              onClick={handleCreateDocument}
              disabled={!documentTitle.trim() || creating}
              aria-label="Create document from template"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Document
                </>
              )}
            </Button>
          )}
          {selectedTemplate && !onCreateDocument && (
            <Button onClick={() => onOpenChange(false)} aria-label="Use selected template">
              Use Template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


