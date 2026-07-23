/**
 * Minute Text Section Component
 * Handles minute text input with templates, character count, and validation
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, MessageSquare, Shield } from 'lucide-react';
import { TemplateManager } from './TemplateManager';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import type { DocumentTemplate } from '@/lib/template-storage';

interface MinuteTextSectionProps {
  minuteText: string;
  minuteTextError: string;
  characterCount: number;
  actionType: 'minute' | 'approve';
  onTextChange: (text: string) => void;
  templates: DocumentTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string | null) => void;
  onTemplateApply: (template: DocumentTemplate) => void;
  onTemplateSave?: (name: string, content: string) => void;
  onTemplateDelete?: (templateId: string) => void;
  newTemplateName: string;
  onNewTemplateNameChange: (name: string) => void;
  templateSectionOpen: boolean;
  onTemplateSectionOpenChange: (open: boolean) => void;
  getTemplatePlainText: (template: DocumentTemplate) => string;
  canDeleteTemplate?: (template: DocumentTemplate) => boolean;
  disabled?: boolean;
}

export const MinuteTextSection: React.FC<MinuteTextSectionProps> = ({
  minuteText,
  minuteTextError,
  characterCount,
  actionType,
  onTextChange,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplateApply,
  onTemplateSave,
  onTemplateDelete,
  newTemplateName,
  onNewTemplateNameChange,
  templateSectionOpen,
  onTemplateSectionOpenChange,
  getTemplatePlainText,
  canDeleteTemplate,
  disabled = false,
}) => {
  const getCharacterCountColor = (count: number, max: number) => {
    if (count > max) return 'text-destructive';
    if (count > max * 0.9) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="minute" className="flex items-center gap-2">
        {actionType === 'approve' ? (
          <>
            <Shield className="h-4 w-4 text-emerald-600" />
            Approval Comments *
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Your Minute *
          </>
        )}
      </Label>
      {actionType === 'approve' && (
        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            <strong>Executive Approval:</strong> This will apply a digital executive seal to the document. 
            Your signature is required and will be embedded in the seal.
          </p>
        </div>
      )}

      {/* Template Manager */}
      <TemplateManager
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={onTemplateSelect}
        onTemplateApply={onTemplateApply}
        onTemplateSave={onTemplateSave}
        onTemplateDelete={onTemplateDelete}
        currentContent={minuteText}
        newTemplateName={newTemplateName}
        onNewTemplateNameChange={onNewTemplateNameChange}
        templateSectionOpen={templateSectionOpen}
        onTemplateSectionOpenChange={onTemplateSectionOpenChange}
        title="Minute Templates"
        placeholder="Save current as template..."
        canDelete={canDeleteTemplate}
        getTemplatePlainText={getTemplatePlainText}
        disabled={disabled}
      />

      {/* Textarea */}
      <Textarea
        id="minute"
        placeholder={
          actionType === 'approve' 
            ? "Enter your approval comments or decision (this will be included with the digital seal)..."
            : "Enter your comments, instructions, or recommendations..."
        }
        value={minuteText}
        onChange={(e) => onTextChange(e.target.value)}
        className={`min-h-[120px] resize-none ${minuteTextError ? 'border-destructive' : ''} ${
          actionType === 'approve' ? 'border-emerald-200 dark:border-emerald-800 focus:border-emerald-500' : ''
        }`}
        maxLength={MODAL_CONSTANTS.MINUTE_TEXT.MAX}
        aria-label={actionType === 'approve' ? "Approval comments" : "Minute text"}
        aria-required="true"
        aria-invalid={!!minuteTextError}
        aria-describedby={
          minuteTextError ? "minute-text-help minute-text-error" : "minute-text-help"
        }
        disabled={disabled}
      />

      <p id="minute-text-help" className="text-xs text-muted-foreground">
        {actionType === 'approve'
          ? "Comments are recorded with the executive seal."
          : "Required. Keep instructions clear for the next officer."}
      </p>

      {/* Character count and error */}
      <div className="flex justify-between text-xs">
        {minuteTextError ? (
          <span className="text-destructive flex items-center gap-1" id="minute-text-error" role="alert">
            <AlertCircle className="h-3 w-3" />
            {minuteTextError}
          </span>
        ) : null}
        <span className={getCharacterCountColor(characterCount, MODAL_CONSTANTS.MINUTE_TEXT.MAX)}>
          {characterCount} / {MODAL_CONSTANTS.MINUTE_TEXT.MAX}
        </span>
      </div>
    </div>
  );
};

