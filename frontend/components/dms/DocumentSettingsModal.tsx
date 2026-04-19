"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';
import type { DocumentType, DocumentStatus, DocumentSensitivity } from '@/lib/dms-storage';
import type { DocumentWorkspace } from '@/lib/dms-storage';

const DOCUMENT_TYPES: DocumentType[] = ['letter', 'memo', 'circular', 'policy', 'report', 'form', 'other'];
const SENSITIVITY_OPTIONS: DocumentSensitivity[] = ['public', 'internal', 'confidential', 'restricted'];
const MAX_TITLE_LENGTH = 500;
const MAX_REFERENCE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

export interface DocumentSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (value: string) => void;
  documentType: DocumentType;
  onDocumentTypeChange: (value: DocumentType) => void;
  status: DocumentStatus;
  onStatusChange: (value: DocumentStatus) => void;
  sensitivity: DocumentSensitivity;
  onSensitivityChange: (value: DocumentSensitivity) => void;
  divisionId?: string;
  onDivisionIdChange: (value: string | undefined) => void;
  departmentId?: string;
  onDepartmentIdChange: (value: string | undefined) => void;
  divisions: Array<{ id: string; name: string; code?: string }>;
  departments: Array<{ id: string; name: string; divisionId: string }>;
  filteredDepartments: Array<{ id: string; name: string }>;
  referenceNumber: string;
  onReferenceNumberChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  tagsInput: string;
  onTagsInputChange: (value: string) => void;
  workspaces: DocumentWorkspace[];
  selectedWorkspaceIds: string[];
  onSelectedWorkspaceIdsChange: (ids: string[]) => void;
  validationErrors: Record<string, string>;
  referenceNumberExists?: boolean;
  checkingReferenceNumber?: boolean;
  titleInputRef?: React.RefObject<HTMLInputElement>;
}

export function DocumentSettingsModal({
  open,
  onOpenChange,
  title,
  onTitleChange,
  documentType,
  onDocumentTypeChange,
  status,
  onStatusChange,
  sensitivity,
  onSensitivityChange,
  divisionId,
  onDivisionIdChange,
  departmentId,
  onDepartmentIdChange,
  divisions,
  departments,
  filteredDepartments,
  referenceNumber,
  onReferenceNumberChange,
  description,
  onDescriptionChange,
  tagsInput,
  onTagsInputChange,
  workspaces,
  selectedWorkspaceIds,
  onSelectedWorkspaceIdsChange,
  validationErrors,
  referenceNumberExists = false,
  checkingReferenceNumber = false,
  titleInputRef,
}: DocumentSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Document Settings
          </DialogTitle>
          <DialogDescription>
            Set document metadata, classification, and organization. Title is required to save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor="settings-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="settings-title"
              ref={titleInputRef}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Port Operations Circular"
              maxLength={MAX_TITLE_LENGTH}
              className={validationErrors.title ? 'border-destructive' : ''}
            />
            {validationErrors.title && (
              <p className="text-xs text-destructive" role="alert">
                {validationErrors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{title.length}/{MAX_TITLE_LENGTH} characters</p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={(v) => onDocumentTypeChange(v as DocumentType)}>
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
              <Select value={status} onValueChange={(v) => onStatusChange(v as DocumentStatus)}>
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Sensitivity</Label>
              <Select value={sensitivity} onValueChange={(v) => onSensitivityChange(v as DocumentSensitivity)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sensitivity" />
                </SelectTrigger>
                <SelectContent>
                  {SENSITIVITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={divisionId ?? 'none'}
                onValueChange={(v) => onDivisionIdChange(v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={departmentId ?? 'none'}
                onValueChange={(v) => onDepartmentIdChange(v === 'none' ? undefined : v)}
                disabled={!divisionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={divisionId ? 'Select department' : 'Select division first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {filteredDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="settings-reference">Reference Number</Label>
              <Input
                id="settings-reference"
                value={referenceNumber}
                onChange={(e) => onReferenceNumberChange(e.target.value)}
                placeholder="e.g. NPA/MOPS/2024/045"
                maxLength={MAX_REFERENCE_LENGTH}
                className={validationErrors.referenceNumber || referenceNumberExists ? 'border-destructive' : ''}
              />
              {checkingReferenceNumber && (
                <p className="text-xs text-muted-foreground">Checking...</p>
              )}
              {validationErrors.referenceNumber && (
                <p className="text-xs text-destructive">{validationErrors.referenceNumber}</p>
              )}
              {referenceNumberExists && !validationErrors.referenceNumber && (
                <p className="text-xs text-destructive">This reference number already exists.</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Brief description of the document"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <p className="text-xs text-muted-foreground">{description.length}/{MAX_DESCRIPTION_LENGTH} characters</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="settings-tags">Tags</Label>
              <Input
                id="settings-tags"
                value={tagsInput}
                onChange={(e) => onTagsInputChange(e.target.value)}
                placeholder="Comma separated e.g. operations, berth-allocation"
              />
              {validationErrors.tags && (
                <p className="text-xs text-destructive">{validationErrors.tags}</p>
              )}
            </div>
            {workspaces.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Workspaces</Label>
                <div className="space-y-2 border rounded-lg p-3 max-h-32 overflow-y-auto">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`ws-${ws.id}`}
                        checked={selectedWorkspaceIds.includes(ws.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectedWorkspaceIdsChange([...selectedWorkspaceIds, ws.id]);
                          } else {
                            onSelectedWorkspaceIdsChange(selectedWorkspaceIds.filter((id) => id !== ws.id));
                          }
                        }}
                      />
                      <label htmlFor={`ws-${ws.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />
                        {ws.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
