/**
 * Reusable Template Manager Component
 * Handles template selection, insertion, saving, and deletion
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { DocumentTemplate } from '@/lib/api/document-templates';

interface TemplateManagerProps {
  templates: DocumentTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string | null) => void;
  onTemplateApply: (template: DocumentTemplate) => void;
  onTemplateSave?: (name: string, content: string) => void;
  onTemplateDelete?: (templateId: string) => void;
  currentContent: string;
  newTemplateName: string;
  onNewTemplateNameChange: (name: string) => void;
  templateSectionOpen: boolean;
  onTemplateSectionOpenChange: (open: boolean) => void;
  title?: string;
  placeholder?: string;
  canDelete?: (template: DocumentTemplate) => boolean;
  getTemplatePlainText?: (template: DocumentTemplate) => string;
  disabled?: boolean;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplateApply,
  onTemplateSave,
  onTemplateDelete,
  currentContent,
  newTemplateName,
  onNewTemplateNameChange,
  templateSectionOpen,
  onTemplateSectionOpenChange,
  title = 'Templates',
  placeholder = 'Save current as template...',
  canDelete,
  getTemplatePlainText,
  disabled = false,
}) => {
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSave = () => {
    if (onTemplateSave && currentContent.trim() && newTemplateName.trim()) {
      onTemplateSave(newTemplateName.trim(), currentContent);
      onNewTemplateNameChange('');
    }
  };

  const handleDelete = () => {
    if (selectedTemplate && onTemplateDelete) {
      onTemplateDelete(selectedTemplate.id);
      onTemplateSelect(null);
    }
  };

  const canDeleteSelected = selectedTemplate
    ? canDelete
      ? canDelete(selectedTemplate)
      : true
    : false;

  return (
    <Collapsible open={templateSectionOpen} onOpenChange={onTemplateSectionOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between" disabled={disabled}>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
            {templates.length > 0 && (
              <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
            )}
          </span>
          {templateSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        <div className="p-3 border border-border rounded-lg bg-muted/30 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedTemplateId ?? 'none'}
              onValueChange={(value) => onTemplateSelect(value === 'none' ? null : value)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
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
              onClick={() => selectedTemplate && onTemplateApply(selectedTemplate)}
              disabled={!selectedTemplate || disabled}
            >
              Insert
            </Button>
            {canDeleteSelected && onTemplateDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive/80"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {selectedTemplate && (
            <div className="rounded-md border border-dashed p-2 text-xs bg-background">
              <p className="font-medium text-foreground mb-1">{selectedTemplate.title}</p>
              {getTemplatePlainText ? (
                <p className="text-muted-foreground line-clamp-2">
                  {getTemplatePlainText(selectedTemplate)}
                </p>
              ) : (
                <p className="text-muted-foreground line-clamp-2">
                  {selectedTemplate.description || 'No description'}
                </p>
              )}
            </div>
          )}

          {onTemplateSave && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => onNewTemplateNameChange(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 min-w-[150px] h-8"
                  disabled={disabled}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!currentContent.trim() || !newTemplateName.trim() || disabled}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

