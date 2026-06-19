"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { TemplateManager } from './TemplateManager';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import type { DocumentTemplate } from '@/lib/template-storage';

interface MemoCompositionSectionProps {
  // Subject
  memoSubject: string;
  onMemoSubjectChange: (subject: string) => void;
  memoSubjectError?: string;
  
  // Content
  memoContent: string;
  onMemoContentChange: (content: string) => void;
  memoContentError?: string;
  characterCount: number;
  
  // Templates
  templates: DocumentTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string | null) => void;
  onTemplateApply: (template: DocumentTemplate) => void;
  onTemplateSave: (name: string, content: string) => void;
  onTemplateDelete: (templateId: string) => void;
  newTemplateName: string;
  onNewTemplateNameChange: (name: string) => void;
  templateSectionOpen: boolean;
  onTemplateSectionOpenChange: (open: boolean) => void;
  getTemplatePlainText: (template: DocumentTemplate) => string;
  canDeleteTemplate: (template: DocumentTemplate) => boolean;
  
  // Suggested note
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
  onTemplateDelete,
  newTemplateName,
  onNewTemplateNameChange,
  templateSectionOpen,
  onTemplateSectionOpenChange,
  getTemplatePlainText,
  canDeleteTemplate,
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
          onChange={(e) => {
            onMemoSubjectChange(e.target.value);
          }}
          placeholder="Re: Subject of response"
          className={memoSubjectError ? 'border-destructive' : ''}
          maxLength={MODAL_CONSTANTS.MEMO_SUBJECT.MAX}
        />
        {memoSubjectError && (
          <p className="text-xs text-destructive">{memoSubjectError}</p>
        )}
      </div>

      {/* Memo Content with Templates */}
      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <span>Memo Content *</span>
          <span className={`text-xs ${getCharacterCountColor(characterCount, MODAL_CONSTANTS.MEMO_CONTENT.MAX)}`}>
            {characterCount}/{MODAL_CONSTANTS.MEMO_CONTENT.MAX}
          </span>
        </Label>

        {/* Template Manager */}
        <TemplateManager
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onTemplateSelect={onTemplateSelect}
          onTemplateApply={onTemplateApply}
          onTemplateSave={onTemplateSave}
          onTemplateDelete={onTemplateDelete}
          currentContent={memoContent}
          newTemplateName={newTemplateName}
          onNewTemplateNameChange={onNewTemplateNameChange}
          templateSectionOpen={templateSectionOpen}
          onTemplateSectionOpenChange={onTemplateSectionOpenChange}
          title="Response Templates"
          placeholder="Template name"
          canDelete={canDeleteTemplate}
          getTemplatePlainText={getTemplatePlainText}
        />

        {/* Suggested Covering Note */}
        {showSuggestedNote && hasFiles && !memoContent.trim() && (
          <Card className="bg-info/5 border-info/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-foreground">
                    <strong>Suggested covering note:</strong>
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    "{suggestedCoveringNote}"
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={onUseSuggestedNote}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Use This
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={onDismissSuggestedNote}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Textarea
          id="content"
          placeholder="Compose your response memo here... Use placeholders like {correspondent}, {subject}, {reference}, {date}, {sender}"
          value={memoContent}
          onChange={(e) => onMemoContentChange(e.target.value)}
          className={`min-h-[200px] resize-none ${memoContentError ? 'border-destructive' : ''}`}
          maxLength={MODAL_CONSTANTS.MEMO_CONTENT.MAX}
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

