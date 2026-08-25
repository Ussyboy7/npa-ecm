"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, FileText, Save } from 'lucide-react';
import { RichTextEditor } from '@/components/dms/RichTextEditor';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import type { DocumentTemplate } from '@/lib/api/document-templates';

interface MemoCompositionSectionProps {
  memoSubject: string;
  onMemoSubjectChange: (subject: string) => void;
  memoSubjectError?: string;
  memoContent: string;
  onMemoContentChange: (content: string) => void;
  memoContentError?: string;
  characterCount: number;
  templates: DocumentTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string | null) => void;
  onTemplateApply: (template: DocumentTemplate) => void;
  onTemplateSave: (name: string, content: string) => void;
  newTemplateName: string;
  onNewTemplateNameChange: (name: string) => void;
  getTemplatePlainText: (template: DocumentTemplate) => string;
  signatureImageUrl?: string;
  showSuggestedNote: boolean;
  suggestedCoveringNote: string;
  onUseSuggestedNote: () => void;
  onDismissSuggestedNote: () => void;
  hasFiles: boolean;
}

export const MemoCompositionSection = ({
  memoSubject,
  onMemoSubjectChange,
  memoSubjectError,
  memoContent,
  onMemoContentChange,
  memoContentError,
  characterCount,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplateApply,
  onTemplateSave,
  newTemplateName,
  onNewTemplateNameChange,
  getTemplatePlainText,
  signatureImageUrl,
  showSuggestedNote,
  suggestedCoveringNote,
  onUseSuggestedNote,
  onDismissSuggestedNote,
  hasFiles,
}: MemoCompositionSectionProps) => {
  const getCharacterCountColor = (current: number, max: number) => {
    if (current >= max) return 'text-destructive';
    if (current >= max * 0.9) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <>
      {/* Memo Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject" className="flex items-center justify-between">
          <span>Memo Subject *</span>
          <span className="text-xs text-muted-foreground font-normal">
            {memoSubject.length}/{MODAL_CONSTANTS.MEMO_SUBJECT.MAX}
          </span>
        </Label>
        <Input
          id="subject"
          value={memoSubject}
          onChange={(e) => onMemoSubjectChange(e.target.value)}
          placeholder="Re: Subject of response"
          className={memoSubjectError ? 'border-destructive' : ''}
          maxLength={MODAL_CONSTANTS.MEMO_SUBJECT.MAX}
        />
        <p className="text-xs text-muted-foreground">Used as memo subject line and DMS document title.</p>
        {memoSubjectError && (
          <p className="text-xs text-destructive">{memoSubjectError}</p>
        )}
      </div>

      {/* Memo Content */}
      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <span>Memo Content *</span>
          <span className={`text-xs ${getCharacterCountColor(characterCount, MODAL_CONSTANTS.MEMO_CONTENT.MAX)}`}>
            {characterCount}/{MODAL_CONSTANTS.MEMO_CONTENT.MAX}
          </span>
        </Label>

        {/* Template toolbar — inline, matching document creation */}
        {templates.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>Templates</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <Select
              value={selectedTemplateId ?? ''}
              onValueChange={(value) => onTemplateSelect(value || null)}
            >
              <SelectTrigger className="h-8 min-w-[14rem] max-w-[20rem]">
                <SelectValue placeholder="Pick a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const t = templates.find((x) => x.id === selectedTemplateId);
                if (t) onTemplateApply(t);
              }}
              disabled={!selectedTemplateId}
            >
              Apply
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <Input
                value={newTemplateName}
                onChange={(e) => onNewTemplateNameChange(e.target.value)}
                placeholder="Template name"
                className="h-8 w-[160px] text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTemplateName.trim() && memoContent.trim()) {
                    onTemplateSave(newTemplateName.trim(), memoContent);
                    onNewTemplateNameChange('');
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  if (newTemplateName.trim() && memoContent.trim()) {
                    onTemplateSave(newTemplateName.trim(), memoContent);
                    onNewTemplateNameChange('');
                  }
                }}
                disabled={!newTemplateName.trim() || !memoContent.trim()}
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Suggested Covering Note */}
        {showSuggestedNote && hasFiles && !memoContent.trim() && (
          <div className="rounded-xl border border-border/60 bg-info/5 border-info/30 p-3">
<div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-foreground">
                    <strong>Suggested covering note:</strong>
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{suggestedCoveringNote}&rdquo;
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="default" onClick={onUseSuggestedNote}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Use This
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={onDismissSuggestedNote}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
</div>
        )}

        <RichTextEditor
          value={memoContent}
          onChange={(html) => onMemoContentChange(html)}
          placeholder="Compose your response memo here..."
          className={`min-h-[300px] ${memoContentError ? 'border-destructive' : ''}`}
          showCharacterCount
          showHeader={false}
          signatureImageUrl={signatureImageUrl}
          tokens={[
            { label: 'Title', value: '{{document.title}}' },
            { label: 'Reference', value: '{{document.reference}}' },
            { label: 'Sender', value: '{{sender.name}}' },
            { label: 'Recipient', value: '{{recipient.name}}' },
            { label: 'Division', value: '{{division.name}}' },
            { label: 'Department', value: '{{department.name}}' },
            { label: 'Date', value: '{{date.today}}' },
          ]}
        />
        {memoContentError && (
          <p className="text-xs text-destructive">{memoContentError}</p>
        )}
        {characterCount > MODAL_CONSTANTS.MEMO_CONTENT.MAX * 0.9 && characterCount < MODAL_CONSTANTS.MEMO_CONTENT.MAX && (
          <p className="text-xs text-warning">Approaching character limit</p>
        )}
      </div>
    </>
  );
};

