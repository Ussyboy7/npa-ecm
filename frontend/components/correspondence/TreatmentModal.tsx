"use client";

import { logError } from '@/lib/client-logger';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, generateReferenceNumber, getNextStepNumber, formatDateForAPI } from '@/lib/correspondence-helpers';
import { saveDraft, getDraftByCorrespondence, deleteDraft } from '@/lib/storage';
import type { Correspondence, Minute } from '@/lib/npa-structure';
import { GRADE_LEVELS } from '@/lib/npa-structure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  FileText,
  Send,
  Save,
  User as UserIcon,
  Building2,
  AlertCircle,
  Search,
  Loader2,
  Upload,
  X,
  File,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Paperclip,
  Eye,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MODAL_CONSTANTS } from '@/lib/modal-constants';
import { ModalErrorHandler } from '@/lib/modal-errors';
import { getForwardingOptions, filterUsersBySearch } from '@/lib/routing-utils';
import { 
  loadUserSignature, 
  ensureDefaultSignatureTemplates, 
  loadUserSignaturePreferences, 
  type StoredSignature, 
  type SignatureTemplate, 
  type UserSignaturePreferences 
} from '@/lib/signature-storage';
import {
  initializeTemplates,
  getTemplatesForUser,
  saveTemplate,
  deleteTemplate,
  type DocumentTemplate,
} from '@/lib/template-storage';

interface TreatmentModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

export const TreatmentModal = ({ correspondence, isOpen, onClose }: TreatmentModalProps) => {
  const { addCorrespondence, addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const { currentUser: activeUser } = useCurrentUser();
  const { users, divisions, departments, offices, officeMemberships, directorates } = useOrganization();
  
  // Form state
  const [currentUser, setCurrentUser] = useState(activeUser ?? null);
  const [memoSubject, setMemoSubject] = useState(`Re: ${correspondence.subject}`);
  const [memoSubjectError, setMemoSubjectError] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoContentError, setMemoContentError] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardToError, setForwardToError] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  
  // UI state
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const [attachmentsSectionOpen, setAttachmentsSectionOpen] = useState(false);
  
  // Templates state
  const [memoTemplates, setMemoTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Signature state
  const [userSignature, setUserSignature] = useState<StoredSignature | null>(null);
  const [applySignature, setApplySignature] = useState(false);
  const [signatureTemplates, setSignatureTemplates] = useState<SignatureTemplate[]>([]);
  const [selectedSignatureTemplateId, setSelectedSignatureTemplateId] = useState<string | null>(null);
  const defaultUserSignaturePreferences: UserSignaturePreferences = {
    templateOverrides: {},
    autoApplyForMinutes: false,
  };
  const [userSignaturePreferences, setUserSignaturePreferences] = useState<UserSignaturePreferences>(defaultUserSignaturePreferences);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);

  const findUserById = useCallback(
    (id?: string | null) => (id ? users.find((user) => user.id === id) : undefined),
    [users],
  );

  // Initialize templates and signature
  useEffect(() => {
    if (activeUser) {
      setCurrentUser(activeUser);
      
      // Load signature
      const signature = loadUserSignature(activeUser.id);
      if (signature) {
        setUserSignature(signature);
      }
      
      // Load signature templates
      ensureDefaultSignatureTemplates();
      const prefs = loadUserSignaturePreferences(activeUser.id);
      setUserSignaturePreferences(prefs ?? defaultUserSignaturePreferences);
      
      // Load memo templates
      initializeTemplates();
      const templates = getTemplatesForUser(activeUser, 'treatment');
      setMemoTemplates(templates);
    }
  }, [activeUser]);

  // Load draft when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const draft = getDraftByCorrespondence(correspondence.id, 'treatment');
    if (draft) {
      setMemoContent(draft.content);
      setCharacterCount(draft.content.length);
      if (draft.subject) setMemoSubject(draft.subject);
      if (draft.forwardTo) setForwardTo(draft.forwardTo);
      if (draft.onBehalfOf) setOnBehalfOf(draft.onBehalfOf);
      setHasDraft(true);
      setDraftId(draft.id);
    } else {
      resetForm();
    }
  }, [isOpen, correspondence.id, currentUser]);

  const resetForm = () => {
    setHasDraft(false);
    setDraftId(null);
    setMemoSubject(`Re: ${correspondence.subject}`);
    setMemoContent('');
    setCharacterCount(0);
    setForwardTo('');
    setOnBehalfOf('');
    setSearchQuery('');
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');
    setUploadedFiles([]);
    setApplySignature(false);
    setSelectedTemplateId(null);
    setSelectedSignatureTemplateId(null);
  };

  const forwardingOptions = useMemo(() => {
    if (!currentUser) return [];
    return getForwardingOptions({
      currentUser,
      activeUsers,
      divisions: divisions.filter((d) => d.isActive !== false),
    });
  }, [currentUser, activeUsers, divisions]);

  const getBehalfOfOptions = () => {
    if (!currentUser) return [];
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map((g) => g.code);
    const currentGradeIndex = gradeOrder.indexOf(currentUser.gradeLevel);
    if (currentGradeIndex === 0) return [];
    const superiorGrade = gradeOrder[currentGradeIndex - 1];
    return activeUsers.filter(
      (user) => user.gradeLevel === superiorGrade && user.division === currentUser.division,
    );
  };

  const behalfOfOptions = useMemo(() => getBehalfOfOptions(), [activeUsers, currentUser, divisions]);

  const filteredForwardingOptions = useMemo(() => {
    return filterUsersBySearch(forwardingOptions, searchQuery, {
      includeDivision: true,
      includeDepartment: true,
      includeEmail: true,
    });
  }, [forwardingOptions, searchQuery]);

  // Get relevant signature templates for treatment
  const relevantSignatureTemplates = useMemo(() => {
    return signatureTemplates.filter(t => 
      t.templateType === 'treatment' || t.templateType === 'minute'
    );
  }, [signatureTemplates]);

  // Character count helpers
  const getCharacterCountColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 90) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleContentChange = (text: string) => {
    setMemoContent(text);
    setCharacterCount(text.length);
    if (memoContentError) setMemoContentError('');
  };

  // File upload handlers
  // Suggested covering note when files are uploaded without content
  const [showSuggestedNote, setShowSuggestedNote] = useState(false);
  const suggestedCoveringNote = `Please find attached our response to the above correspondence regarding "${correspondence.subject}".`;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MODAL_CONSTANTS.FILE_UPLOAD.MAX_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }
      
      // Check file type
      if (!MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES.includes(file.type as typeof MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES[number])) {
        toast.error(`File type "${file.type}" is not allowed.`);
        return;
      }
      
      const uploadedFile: UploadedFile = {
        id: generateId('file'),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, preview: e.target?.result as string }
              : f
          ));
        };
        reader.readAsDataURL(file);
      }
      
      newFiles.push(uploadedFile);
    });
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Show suggested covering note if no content yet
    if (!memoContent.trim() && newFiles.length > 0) {
      setShowSuggestedNote(true);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseSuggestedNote = () => {
    setMemoContent(suggestedCoveringNote);
    setCharacterCount(suggestedCoveringNote.length);
    setShowSuggestedNote(false);
    toast.success('Covering note added');
  };

  const handleDismissSuggestedNote = () => {
    setShowSuggestedNote(false);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Template handlers
  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return;
    const template = memoTemplates.find(t => t.id === selectedTemplateId);
    if (template) {
      // Replace placeholders - use contentHtml or contentText
      let content = template.contentText || template.contentHtml || '';
      content = content.replace(/\{correspondent\}/g, correspondence.senderName || '');
      content = content.replace(/\{subject\}/g, correspondence.subject || '');
      content = content.replace(/\{reference\}/g, correspondence.referenceNumber || '');
      content = content.replace(/\{date\}/g, new Date().toLocaleDateString());
      
      setMemoContent(content);
      setCharacterCount(content.length);
      toast.success('Template applied');
    }
  };

  const handleSaveAsTemplate = () => {
    if (!currentUser || !newTemplateName.trim() || !memoContent.trim()) {
      toast.error('Please enter a template name and content');
      return;
    }
    
    const template = saveTemplate({
      id: generateId('template'),
      scope: 'user',
      scopeId: currentUser.id,
      title: newTemplateName.trim(),
      contentHtml: memoContent,
      contentText: memoContent,
      createdBy: currentUser.id,
      updatedBy: currentUser.id,
      templateType: 'treatment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    setMemoTemplates(prev => [...prev, template]);
    setNewTemplateName('');
    toast.success('Template saved');
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate(templateId);
    setMemoTemplates(prev => prev.filter(t => t.id !== templateId));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
    toast.success('Template deleted');
  };

  const validateForm = (): boolean => {
    setMemoSubjectError('');
    setMemoContentError('');
    setForwardToError('');

    const trimmedSubject = memoSubject.trim();
    if (!trimmedSubject) {
      setMemoSubjectError('Memo subject is required');
      return false;
    }
    if (trimmedSubject.length < MODAL_CONSTANTS.MEMO_SUBJECT.MIN) {
      setMemoSubjectError(`Subject must be at least ${MODAL_CONSTANTS.MEMO_SUBJECT.MIN} characters`);
      return false;
    }
    if (trimmedSubject.length > MODAL_CONSTANTS.MEMO_SUBJECT.MAX) {
      setMemoSubjectError(`Subject must not exceed ${MODAL_CONSTANTS.MEMO_SUBJECT.MAX} characters`);
      return false;
    }

    const trimmedContent = memoContent.trim();
    if (!trimmedContent) {
      setMemoContentError('Memo content is required');
      return false;
    }
    if (trimmedContent.length < MODAL_CONSTANTS.MEMO_CONTENT.MIN) {
      setMemoContentError(`Content must be at least ${MODAL_CONSTANTS.MEMO_CONTENT.MIN} characters`);
      return false;
    }
    if (trimmedContent.length > MODAL_CONSTANTS.MEMO_CONTENT.MAX) {
      setMemoContentError(`Content must not exceed ${MODAL_CONSTANTS.MEMO_CONTENT.MAX} characters`);
      return false;
    }

    if (!forwardTo) {
      setForwardToError('Please select a recipient');
      return false;
    }

    if (applySignature && relevantSignatureTemplates.length > 0 && !selectedSignatureTemplateId) {
      toast.error('Please select a signature template');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      return;
    }
    if (!validateForm()) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      setShowConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    const recipient = findUserById(forwardTo);
    const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) : null;
    const division = currentUser.division ? divisions.find((div) => div.id === currentUser.division) : undefined;

    try {
      // Create treatment minute
      const existingMinutes = getMinutesByCorrespondenceId(correspondence.id);
      const nextStep = getNextStepNumber(existingMinutes);

      // Build minute text with signature if applicable
      let minuteText = `[TREATMENT & RESPONSE]\n\nSubject: ${memoSubject.trim()}\n\n${memoContent.trim()}`;
      
      if (applySignature && selectedSignatureTemplateId) {
        const signatureTemplate = relevantSignatureTemplates.find(t => t.id === selectedSignatureTemplateId);
        if (signatureTemplate) {
          minuteText += `\n\n---\n${signatureTemplate.name}`;
        }
      }

      const minuteResponse = await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        body: JSON.stringify({
          correspondence: correspondence.id,
          user_id: currentUser.id,
          grade_level: currentUser.gradeLevel,
          action_type: 'treat',
          minute_text: minuteText,
          direction: 'upward',
          step_number: nextStep,
          signature: applySignature && userSignature ? userSignature.imageData : null,
        }),
      });

      // Upload attachments if any
      if (uploadedFiles.length > 0) {
        for (const uploadedFile of uploadedFiles) {
          const formData = new FormData();
          formData.append('file', uploadedFile.file);
          formData.append('correspondence', correspondence.id);
          
          await apiFetch(`/correspondence/items/${correspondence.id}/attachments/`, {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
          });
        }
      }

      // Update original correspondence
      await apiFetch(`/correspondence/items/${correspondence.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          direction: 'upward',
          current_approver_id: forwardTo,
          status: 'in-progress',
        }),
      });

      // Create new response correspondence
      await apiFetch('/correspondence/items/', {
        method: 'POST',
        body: JSON.stringify({
          reference_number: generateReferenceNumber(division?.code || 'NPA'),
          subject: memoSubject.trim(),
          source: 'internal',
          received_date: formatDateForAPI(new Date()),
          sender_name: actingFor ? `${currentUser.name} (on behalf of ${actingFor.name})` : currentUser.name,
          sender_organization: division?.name ?? '',
          status: 'pending',
          priority: correspondence.priority,
          division: recipient?.division ?? correspondence.divisionId,
          department: recipient?.department ?? correspondence.departmentId,
          current_approver_id: forwardTo,
          direction: 'upward',
          parent_correspondence_id: correspondence.id,
        }),
      });

      await syncFromApi();

      if (draftId) {
        deleteDraft(draftId);
      }

      setShowConfirmation(false);
      setTimeout(() => {
        onClose();
        setTimeout(() => resetForm(), 100);
      }, 200);

      toast.success('Response sent successfully', {
        description: actingFor
          ? `Sent to ${recipient?.name ?? 'selected user'} on behalf of ${actingFor.name}`
          : `Sent to ${recipient?.name ?? 'selected user'}`,
      });
    } catch (error: any) {
      logError('Failed to process treatment', error);
      const modalError = ModalErrorHandler.createErrorFromApi(error);
      toast.error(ModalErrorHandler.getUserFriendlyMessage(modalError));
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!currentUser) {
      toast.error('Current user not found.');
      return;
    }
    const draft = saveDraft({
      id: draftId || generateId('draft'),
      correspondenceId: correspondence.id,
      type: 'treatment',
      content: memoContent,
      subject: memoSubject,
      forwardTo,
      onBehalfOf: onBehalfOf !== 'none' ? onBehalfOf : undefined,
      timestamp: new Date().toISOString(),
    });

    setHasDraft(true);
    setDraftId(draft.id);
    toast.info('Draft saved');
  };

  if (!currentUser) return null;

  const divisionEntity = currentUser.division
    ? divisions.find((division) => division.id === currentUser.division) ?? null
    : null;
  const selectedRecipient = forwardTo ? findUserById(forwardTo) ?? null : null;
  const actingFor = onBehalfOf && onBehalfOf !== 'none' ? findUserById(onBehalfOf) ?? null : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Treat & Respond
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">Draft</Badge>
            )}
            {uploadedFiles.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Compose a formal response memo to this correspondence
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Original Correspondence Card */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1 truncate">
                      Original: {correspondence.subject}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>Ref: {correspondence.referenceNumber}</span>
                      <span>•</span>
                      <span>From: {correspondence.senderName}</span>
                      {divisionEntity && (
                        <>
                          <span>•</span>
                          <span>{divisionEntity.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      correspondence.priority === 'urgent' ? 'destructive' :
                      correspondence.priority === 'high' ? 'default' : 'secondary'
                    }
                  >
                    {correspondence.priority}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Acting on Behalf Of */}
            {behalfOfOptions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Acting on behalf of (optional)
                </Label>
                <Select value={onBehalfOf} onValueChange={setOnBehalfOf}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select if acting for someone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Acting for myself</SelectItem>
                    <Separator className="my-1" />
                    {behalfOfOptions.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.systemRole} - {user.gradeLevel}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {actingFor && (
                  <Card className="bg-info/5 border-info/20">
                    <CardContent className="p-3">
                      <p className="text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-info" />
                        Acting on behalf of <strong>{actingFor.name}</strong> ({actingFor.systemRole})
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

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
                  setMemoSubject(e.target.value);
                  if (memoSubjectError) setMemoSubjectError('');
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

              {/* Collapsible Template Section */}
              <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Response Templates
                      {memoTemplates.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{memoTemplates.length}</Badge>
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
                        onValueChange={(v) => setSelectedTemplateId(v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No template</SelectItem>
                          {memoTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyTemplate}
                        disabled={!selectedTemplateId}
                      >
                        Insert
                      </Button>
                      {selectedTemplateId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(selectedTemplateId)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Separator />

                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="h-8 w-[200px]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveAsTemplate}
                        disabled={!newTemplateName.trim() || !memoContent.trim()}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save Current
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Suggested Covering Note */}
              {showSuggestedNote && uploadedFiles.length > 0 && !memoContent.trim() && (
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
                            onClick={handleUseSuggestedNote}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Use This
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleDismissSuggestedNote}
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
                placeholder="Compose your response memo here...

You can use placeholders like {correspondent}, {subject}, {reference}, {date} in templates."
                value={memoContent}
                onChange={(e) => handleContentChange(e.target.value)}
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

            <Separator />

            {/* Attachments Section */}
            <Collapsible open={attachmentsSectionOpen} onOpenChange={setAttachmentsSectionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                    {uploadedFiles.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{uploadedFiles.length}</Badge>
                    )}
                  </span>
                  {attachmentsSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={MODAL_CONSTANTS.FILE_UPLOAD.ALLOWED_TYPES.join(',')}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop files here, or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Images • Max 10MB each
                  </p>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background"
                      >
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <File className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Forward To Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Forward Response To *
              </Label>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, division, department..."
                  className="pl-9"
                />
              </div>

              {/* Purpose Selection */}
              <div className="flex flex-wrap gap-2">
                {(['action', 'approval', 'comment', 'information'] as const).map((p) => (
                  <Badge
                    key={p}
                    variant={purpose === p ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => setPurpose(p)}
                  >
                    {p === 'action' ? 'For Action' :
                     p === 'approval' ? 'For Approval' :
                     p === 'comment' ? 'For Comment' : 'For Information'}
                  </Badge>
                ))}
              </div>

              {/* Recipients List */}
              <ScrollArea className="h-[200px] border border-border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredForwardingOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recipients found
                    </p>
                  ) : (
                    filteredForwardingOptions.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          forwardTo === user.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setForwardTo(user.id);
                          if (forwardToError) setForwardToError('');
                        }}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.systemRole} • {user.division || 'No division'}
                          </p>
                        </div>
                        {forwardTo === user.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {forwardToError && (
                <p className="text-xs text-destructive">{forwardToError}</p>
              )}

              {/* Selected Recipient Card */}
              {selectedRecipient && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedRecipient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedRecipient.systemRole} • {purpose === 'action' ? 'For Action' :
                             purpose === 'approval' ? 'For Approval' :
                             purpose === 'comment' ? 'For Comment' : 'For Information'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setForwardTo('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Digital Signature Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Digital Signature
                </Label>
                <Switch
                  checked={applySignature}
                  onCheckedChange={setApplySignature}
                  disabled={!userSignature}
                />
              </div>

              {!userSignature ? (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No signature on file.{' '}
                      <a href="/settings" className="text-primary hover:underline">
                        Upload one in Settings
                      </a>
                    </p>
                  </CardContent>
                </Card>
              ) : applySignature ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 border border-border rounded-lg">
                    <div className="p-2 border rounded bg-white">
                      <img
                        src={userSignature.imageData}
                        alt="Your signature"
                        className="max-h-16 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Signature on File</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(userSignature.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {relevantSignatureTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Signature Template</Label>
                      <Select
                        value={selectedSignatureTemplateId ?? undefined}
                        onValueChange={setSelectedSignatureTemplateId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {relevantSignatureTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{template.name}</span>
                                <span className="text-xs text-muted-foreground">{template.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Toggle on to include your digital signature
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-primary">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => !isSubmitting && setShowConfirmation(false)}
        onConfirm={handleConfirm}
        type="treatment"
        data={{
          currentUserName: currentUser.name,
          recipientName: selectedRecipient?.name || '',
          subject: memoSubject,
          content: memoContent,
          onBehalfOf: actingFor?.name,
          direction: 'upward',
        }}
        disabled={isSubmitting}
      />
    </Dialog>
  );
};
