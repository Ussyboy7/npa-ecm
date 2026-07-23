"use client";

import { memo } from 'react';
import { Mail, FileText, FolderOpen, Save, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { appType } from '@/lib/app-type';
import { FormData, FlowType } from '../register-utils';

interface RegistrationSummaryProps {
  formData: FormData;
  flowType: FlowType;
  documentFiles: File[];
  selectedOfficeName?: string;
  selectedAssigneeName?: string;
  hasDraft: boolean;
  onSaveDraft: () => void;
  onClearDraft: () => void;
  onNavigateToInbox: () => void;
  onNavigateToRegistered: () => void;
  onNavigateToDMS: () => void;
}

export const RegistrationSummary = memo(function RegistrationSummary({
  formData,
  flowType,
  documentFiles,
  selectedOfficeName,
  selectedAssigneeName,
  hasDraft,
  onSaveDraft,
  onClearDraft,
  onNavigateToInbox,
  onNavigateToRegistered,
  onNavigateToDMS,
}: RegistrationSummaryProps) {
  return (
    <>
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
        <h2 className={appType.panelTitle}>Summary</h2>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Office</span>
            <span className="font-medium text-right max-w-[150px] truncate">
              {selectedOfficeName || '—'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Flow</span>
            <Badge variant={flowType === 'inward' ? 'default' : 'secondary'} className="text-[10px] h-5">
              {flowType === 'inward' ? 'Inward' : 'Outward'}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono text-xs text-right max-w-[150px] truncate">
              {formData.referenceNumber}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Priority</span>
            <Badge
              variant={
                formData.priority === 'urgent'
                  ? 'destructive'
                  : formData.priority === 'high'
                  ? 'default'
                  : formData.priority === 'low'
                  ? 'outline'
                  : 'secondary'
              }
              className="text-[10px] h-5"
            >
              {formData.priority}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Assigned to</span>
            <span className="font-medium text-right max-w-[150px] truncate">
              {selectedAssigneeName || '—'}
            </span>
          </div>
          <Separator />
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Documents</span>
            <div className="flex items-center gap-1">
              {documentFiles.length > 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span>{documentFiles.length} file(s)</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">None</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="quiet"
            onClick={onSaveDraft}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {hasDraft && (
            <Button
              type="button"
              variant="ghost"
              size="quiet"
              className="text-destructive hover:text-destructive"
              onClick={onClearDraft}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Draft
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1">
        <h2 className={appType.panelTitle}>Quick Links</h2>
        <Button
          variant="ghost"
          size="quiet"
          onClick={onNavigateToInbox}
        >
          <Mail className="h-4 w-4 mr-2" />
          My Inbox
        </Button>
        <Button
          variant="ghost"
          size="quiet"
          onClick={onNavigateToRegistered}
        >
          <FileText className="h-4 w-4 mr-2" />
          Registered Items
        </Button>
        <Button
          variant="ghost"
          size="quiet"
          onClick={onNavigateToDMS}
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Document Management
        </Button>
      </div>
    </>
  );
});
