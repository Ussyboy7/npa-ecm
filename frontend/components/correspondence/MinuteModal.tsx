import { logError } from '@/lib/client-logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { generateId, getNextStepNumber } from '@/lib/correspondence-helpers';
import {
  saveDraft,
  getDraftByCorrespondence,
  deleteDraft,
} from '@/lib/storage';
import type { Minute } from '@/lib/npa-structure';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Send, 
  Save, 
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Search
} from 'lucide-react';
import { 
  GRADE_LEVELS,
  getDivisionById,
  getDepartmentById,
  type Correspondence,
  type DistributionRecipient,
  type User,
} from '@/lib/npa-structure';
import { DistributionSelector } from './DistributionSelector';
import { loadUserSignature, ensureDefaultSignatureTemplates, loadUserSignaturePreferences, type StoredSignature, type SignatureTemplate, type UserSignaturePreferences } from '@/lib/signature-storage';
import {
  initializeTemplates,
  getTemplatesForUser,
  createTemplate as createDocumentTemplate,
  deleteTemplate,
  type DocumentTemplate,
} from '@/lib/template-storage';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganization, type AssistantAssignment } from '@/contexts/OrganizationContext';
import { apiFetch } from '@/lib/api-client';

interface MinuteModalProps {
  correspondence: Correspondence;
  isOpen: boolean;
  onClose: () => void;
  direction: 'downward' | 'upward';
}

export const MinuteModal = ({ correspondence, isOpen, onClose, direction: initialDirection }: MinuteModalProps) => {
  const { addMinute, updateCorrespondence, getMinutesByCorrespondenceId, syncFromApi } = useCorrespondence();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [minuteText, setMinuteText] = useState('');
  const [actionType, setActionType] = useState<'minute' | 'approve'>('minute');
  const [forwardTo, setForwardTo] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [distribution, setDistribution] = useState<DistributionRecipient[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<'upward' | 'downward'>(initialDirection);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSignature, setUserSignature] = useState<StoredSignature | null>(null);
  const [applySignature, setApplySignature] = useState(false);
  const [applySignatureManuallySet, setApplySignatureManuallySet] = useState(false);
  const [signatureTemplates, setSignatureTemplates] = useState<SignatureTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
const [minuteTemplates, setMinuteTemplates] = useState<DocumentTemplate[]>([]);
const [selectedMinuteTemplateId, setSelectedMinuteTemplateId] = useState<string | null>(null);
const [newTemplateName, setNewTemplateName] = useState('');
  const defaultUserSignaturePreferences: UserSignaturePreferences = {
    templateOverrides: {},
    autoApplyForMinutes: false,
  };
  const [userSignaturePreferences, setUserSignaturePreferences] = useState<UserSignaturePreferences>(defaultUserSignaturePreferences);
  const { currentUser: activeUser } = useCurrentUser();
  const { assistantAssignments, users: organizationUsers } = useOrganization();

  const allDirectoryUsers = organizationUsers;
  const activeDirectoryUsers = useMemo(
    () => organizationUsers.filter((user) => user.active !== false),
    [organizationUsers],
  );

  const assistantTeam = useMemo(() => {
    if (!currentUser) return [];
    return assistantAssignments
      .filter((assignment) => assignment.executiveId === currentUser.id)
      .map((assignment) => {
        const assistant = activeDirectoryUsers.find((user) => user.id === assignment.assistantId);
        if (!assistant) {
          return null;
        }
        return { assignment, assistant } as { assignment: AssistantAssignment; assistant: User };
      })
      .filter((entry): entry is { assignment: AssistantAssignment; assistant: User } => entry !== null);
  }, [assistantAssignments, activeDirectoryUsers, currentUser]);

  const assistantAssignmentsById = useMemo(() => {
    const map = new Map<string, AssistantAssignment>();
    assistantTeam.forEach(({ assignment, assistant }) => {
      map.set(assistant.id, assignment);
    });
    return map;
  }, [assistantTeam]);

  const assistantCandidates = useMemo(
    () =>
      assistantTeam
        .filter(({ assignment }) => assignment.permissions.includes('forward') || assignment.permissions.includes('draft') || assignment.permissions.includes('coordinate'))
        .map(({ assistant }) => assistant),
    [assistantTeam],
  );

  const findUserById = useCallback(
    (id: string) => activeDirectoryUsers.find((user) => user.id === id),
    [activeDirectoryUsers],
  );
 
  useEffect(() => {
    initializeTemplates();
  }, []);

  const refreshMinuteTemplates = useCallback(
    (userArg?: User) => {
      initializeTemplates();
      const targetUser = userArg ?? currentUser;
      if (!targetUser) {
        setMinuteTemplates([]);
        return;
      }
      const templates = getTemplatesForUser(targetUser, 'minute');
      setMinuteTemplates(templates);
    },
    [currentUser],
  );

  const getTemplatePlainText = (template: DocumentTemplate) => {
    if (template.contentText && template.contentText.trim().length > 0) {
      return template.contentText.trim();
    }
    if (!template.contentHtml) return '';
    return template.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const convertTextToHtml = (text: string) => {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return `<p>${text.trim()}</p>`;
    }

    return paragraphs
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
      .join('\n');
  };
  
  useEffect(() => {
    const selectedUser = activeUser ?? organizationUsers.find((user) => user.active) ?? null;
    if (!selectedUser) return;
    setCurrentUser(selectedUser);
    const signature = loadUserSignature(selectedUser.id);
    if (signature) {
      setUserSignature(signature);
    }
    refreshMinuteTemplates(selectedUser);
  }, [activeUser, organizationUsers, refreshMinuteTemplates]);

  // Check if user is management level (MDCS, EDCS, MSS1, MSS2, MSS3)
  const userPermissions = useUserPermissions(currentUser ?? undefined);
  const canDistribute = userPermissions.canDistribute;
  
  // Check if user is MD (highest level - can only send downward)
  const isMD = currentUser?.gradeLevel === 'MDCS';
  
  // Other users (below MD) can choose direction
  const canChooseDirection = !isMD;

  useEffect(() => {
    if (isOpen) {
      refreshMinuteTemplates(currentUser ?? undefined);

      // Load draft if exists
      const draft = getDraftByCorrespondence(correspondence.id, 'minute');
      if (draft) {
        setMinuteText(draft.content);
        setCharacterCount(draft.content.length);
        if (draft.forwardTo) setForwardTo(draft.forwardTo);
        if (draft.actionType) setActionType(draft.actionType as 'minute' | 'approve');
        setHasDraft(true);
        setDraftId(draft.id);
      } else {
        setHasDraft(false);
        setDraftId(null);
        setMinuteText('');
        setCharacterCount(0);
        setForwardTo('');
        setSelectedDirection(initialDirection);
        setSearchQuery('');
        setActionType('minute');
        setApplySignature(false);
        setNewTemplateName('');
        setSelectedMinuteTemplateId(null);
      }
    }
  }, [isOpen, correspondence.id, initialDirection, refreshMinuteTemplates, currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      const signature = loadUserSignature(currentUser.id);
      setUserSignature(signature);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isOpen) return;
    refreshMinuteTemplates();
  }, [isOpen, refreshMinuteTemplates]);

  useEffect(() => {
    if (actionType === 'approve') {
      setApplySignature(true);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!userSignature) {
      setApplySignature(false);
      setApplySignatureManuallySet(false);
      return;
    }

    if (!applySignatureManuallySet) {
      setApplySignature(userSignaturePreferences.autoApplyForMinutes ?? false);
    }
  }, [actionType, userSignature, userSignaturePreferences.autoApplyForMinutes, applySignatureManuallySet]);

  useEffect(() => {
    setApplySignatureManuallySet(false);
  }, [actionType]);

  useEffect(() => {
    const defaults = ensureDefaultSignatureTemplates();
    setSignatureTemplates(defaults);
  }, [isOpen]);

  useEffect(() => {
    const templateType = actionType === 'approve' ? 'approval' : 'minute';
    const available = signatureTemplates.filter(template => template.templateType === templateType);
    if (available.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    const preferredOverride = userSignaturePreferences.templateOverrides?.[templateType];
    if (preferredOverride && available.some(template => template.id === preferredOverride)) {
      setSelectedTemplateId(preferredOverride);
      return;
    }

    setSelectedTemplateId(prev => {
      if (prev && available.some(template => template.id === prev)) {
        return prev;
      }
      const defaultTemplate = available.find(template => template.defaultApply) ?? available[0] ?? null;
      return defaultTemplate ? defaultTemplate.id : null;
    });
  }, [actionType, signatureTemplates, userSignaturePreferences]);

  useEffect(() => {
    if (currentUser?.id) {
      const prefs = loadUserSignaturePreferences(currentUser.id) ?? defaultUserSignaturePreferences;
      setUserSignaturePreferences({
        templateOverrides: { ...(prefs.templateOverrides ?? {}) },
        autoApplyForMinutes: prefs.autoApplyForMinutes ?? false,
      });
    } else {
      setUserSignaturePreferences(defaultUserSignaturePreferences);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isOpen) {
      setApplySignatureManuallySet(false);
    }
  }, [isOpen]);

  const filteredMinuteTemplates = useMemo(
    () =>
      minuteTemplates.filter((template) => {
        const templateAction = template.actionType ?? 'any';
        return templateAction === 'any' || templateAction === actionType;
      }),
    [minuteTemplates, actionType],
  );

  const existingMinutes = useMemo(
    () => getMinutesByCorrespondenceId(correspondence.id),
    [correspondence.id, getMinutesByCorrespondenceId],
  );

  useEffect(() => {
    const available = filteredMinuteTemplates;
    if (available.length === 0) {
      setSelectedMinuteTemplateId(null);
      return;
    }
    setSelectedMinuteTemplateId(prev => {
      if (prev && available.some(template => template.id === prev)) {
        return prev;
      }
      return available[0]?.id ?? null;
    });
  }, [filteredMinuteTemplates]);

  const selectedMinuteTemplate = useMemo(
    () => minuteTemplates.find(template => template.id === selectedMinuteTemplateId) ?? null,
    [minuteTemplates, selectedMinuteTemplateId],
  );

  const canDeleteSelectedTemplate =
    !!selectedMinuteTemplate &&
    selectedMinuteTemplate.scope === 'user' &&
    selectedMinuteTemplate.createdBy === currentUser?.id;

  // Get previous minute
  const previousMinute = useMemo(() => {
    return existingMinutes
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [existingMinutes]);

  const previousUser = previousMinute ? findUserById(previousMinute.userId) : null;

  // Get suggested next approvers based on hierarchy and organizational structure
  const getSuggestedApprovers = () => {
    // MD can only send downward, others use selected direction or initial
    const dir = isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection);
    
    // Get grade levels sorted by level (higher level = more authority)
    const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map(g => g.code);
    const currentGradeIndex = currentUser?.gradeLevel ? gradeOrder.indexOf(currentUser.gradeLevel) : -1;
    
    // Get current user's division and directorate info
    const division = currentUser?.division ? getDivisionById(currentUser.division) : null;
    const currentDirectorate = division?.directorateId;
    const candidates = new Map<string, User>();

    const addCandidate = (user?: User) => {
      if (!user) return;
      if (user.id === currentUser?.id) return;
      if (user.active === false) return;
      candidates.set(user.id, user);
    };

    if (dir === 'downward') {
      const lowerGrades = gradeOrder.slice(currentGradeIndex + 1);

      if (isMD) {
        activeDirectoryUsers
          .filter((user) => lowerGrades.includes(user.gradeLevel))
          .sort((a, b) => {
            const aGradeIndex = gradeOrder.indexOf(a.gradeLevel);
            const bGradeIndex = gradeOrder.indexOf(b.gradeLevel);
            if (aGradeIndex !== bGradeIndex) return aGradeIndex - bGradeIndex;
            return a.name.localeCompare(b.name);
          })
          .forEach(addCandidate);
      } else {
        activeDirectoryUsers
          .filter(
            (user) =>
              lowerGrades.includes(user.gradeLevel) &&
              user.division === currentUser?.division,
          )
          .forEach(addCandidate);
      }
    } else {
      const higherGrades = gradeOrder.slice(0, currentGradeIndex);

      activeDirectoryUsers
        .filter((user) => {
          if (!higherGrades.includes(user.gradeLevel)) return false;
          if (!user.division) return false;

          const userDivision = getDivisionById(user.division);
          const userDirectorate = userDivision?.directorateId;

          const sameDivision = user.division === currentUser?.division;
          const sameDirectorate = currentDirectorate && userDirectorate === currentDirectorate;

          return sameDivision || Boolean(sameDirectorate);
        })
        .forEach(addCandidate);
    }

    return Array.from(candidates.values());
  };

  const suggestedApprovers = getSuggestedApprovers();
  const suggestedNext = suggestedApprovers[0]; // Immediate next in hierarchy
  
  // Filter users based on search query
  const filterUsersBySearch = (users: User[]) => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => {
      const nameMatch = user.name.toLowerCase().includes(query);
      const emailMatch = user.email.toLowerCase().includes(query);
      const roleMatch = user.systemRole.toLowerCase().includes(query);
      const division = user.division ? getDivisionById(user.division) : null;
      const divisionMatch = division?.name.toLowerCase().includes(query) || false;
      const department = user.department ? getDepartmentById(user.department) : null;
      const departmentMatch = department?.name.toLowerCase().includes(query) || false;
      
      return nameMatch || emailMatch || roleMatch || divisionMatch || departmentMatch;
    });
  };
  
  const assistantIds = useMemo(() => new Set(assistantCandidates.map((user) => user.id)), [assistantCandidates]);
  const baseApproversWithoutAssistants = useMemo(
    () => suggestedApprovers.filter((user) => !assistantIds.has(user.id)),
    [suggestedApprovers, assistantIds],
  );

  const filteredAssistants = filterUsersBySearch(assistantCandidates);
  const filteredApprovers = filterUsersBySearch(baseApproversWithoutAssistants);
  const filteredNext = filteredApprovers[0] ?? filteredAssistants[0] ?? null;
  const nextIsAssistant = filteredNext ? assistantAssignmentsById.has(filteredNext.id) : false;
  const approverList = !searchQuery.trim() && filteredNext && !nextIsAssistant && filteredApprovers.length > 0 && filteredApprovers[0].id === filteredNext.id
    ? filteredApprovers.slice(1)
    : filteredApprovers;
  const assistantList = !searchQuery.trim() && filteredNext && nextIsAssistant
    ? filteredAssistants.filter((user, index) => !(index === 0 && user.id === filteredNext.id))
    : filteredAssistants;

  const handleTextChange = (text: string) => {
    setMinuteText(text);
    setCharacterCount(text.length);
  };

  const handleApplyMinuteTemplate = () => {
    if (!selectedMinuteTemplate) {
      toast.error('Select a template to insert.');
      return;
    }

    const content = getTemplatePlainText(selectedMinuteTemplate);
    if (!content) {
      toast.error('Selected template has no content.');
      return;
    }

    const updated = minuteText.trim()
      ? `${minuteText.trim()}\n\n${content}`
      : content;

    handleTextChange(updated);
    toast.success('Template inserted into your minute.');
  };

  const handleSaveMinuteTemplate = () => {
    if (!currentUser) {
      toast.error('Select a user context before saving templates.');
      return;
    }

    const content = minuteText.trim();
    if (!content) {
      toast.error('Write your minute before saving it as a template.');
      return;
    }

    const resolvedName = (newTemplateName || content.split('\n')[0]).trim();
    if (!resolvedName) {
      toast.error('Provide a name for the template.');
      return;
    }

    const contentHtml = convertTextToHtml(content);
    const created = createDocumentTemplate({
      scope: 'user',
      scopeId: currentUser.id,
      title: resolvedName.slice(0, 80),
      description: actionType === 'approve' ? 'Approval minute template' : 'Minute template',
      contentHtml,
      contentText: content,
      createdBy: currentUser.id,
      updatedBy: currentUser.id,
      isDefault: false,
      templateType: 'minute',
      actionType,
    });

    refreshMinuteTemplates();
    setSelectedMinuteTemplateId(created.id);
    setNewTemplateName('');
    toast.success('Template saved for quick reuse.');
  };

  const handleDeleteSelectedMinuteTemplate = () => {
    if (!selectedMinuteTemplate || !canDeleteSelectedTemplate) {
      toast.error('Only custom templates can be removed.');
      return;
    }

    deleteTemplate(selectedMinuteTemplate.id);
    refreshMinuteTemplates();
    setSelectedMinuteTemplateId(null);
    toast.success('Template removed.');
  };

  const handleSubmit = () => {
    if (!minuteText.trim()) {
      toast.error('Please enter your minute');
      return;
    }

    if (!forwardTo) {
      toast.error('Please select who to forward to');
      return;
    }

    if (actionType === 'approve' && !userSignature) {
      toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
      return;
    }

    if (applySignature) {
      const availableTemplates = relevantTemplates;
      if (availableTemplates.length > 0 && !selectedTemplateId) {
        toast.error('Please select a signature template.');
        return;
      }
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!currentUser) {
      toast.error('Current user not found. Cannot perform action.');
      setShowConfirmation(false);
      return;
    }

    if (actionType === 'approve' && !userSignature) {
      toast.error('A digital signature is required to approve. Upload your signature in Settings → Signature.');
      setShowConfirmation(false);
      return;
    }

    if (applySignature && !userSignature) {
      toast.error('Signature not found. Upload your signature or disable signature application.');
      setShowConfirmation(false);
      return;
    }

    const forwardUser = findUserById(forwardTo);
    const nextStep = getNextStepNumber(existingMinutes);

    // MD can only send downward, others use selected direction or initial
    const finalDirection = isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection);

    const templateForSignature = applySignature
      ? (selectedTemplateId
          ? signatureTemplates.find(t => t.id === selectedTemplateId)
          : relevantTemplates.find(t => t.defaultApply) ?? relevantTemplates[0])
      : undefined;

    const context = getTemplateContext();
    const renderedTemplateText = templateForSignature ? renderTemplateText(templateForSignature, context) : undefined;

    const signaturePayload = applySignature && userSignature ? {
      imageData: userSignature.imageData,
      appliedAt: new Date().toISOString(),
      fileName: userSignature.fileName,
      templateId: templateForSignature?.id,
      templateType: templateForSignature?.templateType,
      renderedText: renderedTemplateText,
    } : undefined;

    const existingDistribution = correspondence.distribution ?? [];
    let distributionWithAddedBy: DistributionRecipient[] = [];

    if (canDistribute && distribution.length > 0) {
      distributionWithAddedBy = distribution.map((recipient) => ({
        ...recipient,
        addedById: recipient.addedById || currentUser.id,
        addedByName: recipient.addedByName || currentUser.name,
        addedAt: recipient.addedAt || new Date().toISOString(),
      }));
    }

    const newMinute: Minute = {
      id: generateId('min'),
      correspondenceId: correspondence.id,
      userId: currentUser.id,
      gradeLevel: currentUser.gradeLevel,
      actionType,
      minuteText,
      direction: finalDirection,
      stepNumber: nextStep,
      timestamp: new Date().toISOString(),
      actedBySecretary: false,
      actedByAssistant: false,
      signature: signaturePayload,
    };

    try {
      const existingKeys = new Set(
        existingDistribution.map((entry) => {
          const targetId =
            entry.type === 'directorate'
              ? entry.directorateId ?? entry.id
              : entry.type === 'division'
              ? entry.divisionId ?? entry.id
              : entry.departmentId ?? entry.id;
          return `${entry.type}:${targetId}`;
        }),
      );
      const newDistributionEntries = distributionWithAddedBy.filter((entry) => {
        const targetId =
          entry.type === 'directorate'
            ? entry.directorateId ?? entry.id
            : entry.type === 'division'
            ? entry.divisionId ?? entry.id
            : entry.departmentId ?? entry.id;
        return !existingKeys.has(`${entry.type}:${targetId}`);
      });

      await addMinute(newMinute);

      await updateCorrespondence(correspondence.id, {
        currentApproverId: forwardTo,
        status: 'in-progress',
        direction: finalDirection,
      });

      if (canDistribute && newDistributionEntries.length > 0) {
        await Promise.all(
          newDistributionEntries.map((recipient) =>
            apiFetch('/correspondence/distribution/', {
              method: 'POST',
              body: JSON.stringify({
                correspondence: correspondence.id,
                recipient_type: recipient.type,
                directorate:
                  recipient.type === 'directorate'
                    ? recipient.directorateId ?? recipient.id
                    : recipient.directorateId ?? null,
                division:
                  recipient.type === 'division'
                    ? recipient.divisionId ?? recipient.id
                    : recipient.divisionId ?? null,
                department:
                  recipient.type === 'department'
                    ? recipient.departmentId ?? recipient.id
                    : recipient.departmentId ?? null,
                purpose: recipient.purpose ?? 'information',
                added_by_id: recipient.addedById ?? currentUser.id,
              }),
            }),
          ),
        );
      }

      await syncFromApi();

      if (draftId) {
        deleteDraft(draftId);
      }

      setShowConfirmation(false);

      setTimeout(() => {
        onClose();

        setTimeout(() => {
          setMinuteText('');
          setForwardTo('');
          setActionType('minute');
          setDistribution([]);
          setHasDraft(false);
          setDraftId(null);
          setSearchQuery('');
        }, 100);
      }, 200);

      toast.success('Minute added successfully', {
        description: `Forwarded to ${forwardUser?.name ?? 'selected user'}`,
      });
    } catch (error) {
      logError('Failed to record minute', error);
      toast.error('Unable to save minute', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      setShowConfirmation(false);
    }
  };

  const handleSaveDraft = () => {
    const draft = saveDraft({
      id: draftId || generateId('draft'),
      correspondenceId: correspondence.id,
      type: 'minute',
      content: minuteText,
      forwardTo,
      actionType,
      timestamp: new Date().toISOString(),
    });
    
    setHasDraft(true);
    setDraftId(draft.id);
    
    toast.info('Draft saved', {
      description: 'You can continue editing later',
    });
  };

  const division = correspondence.divisionId ? getDivisionById(correspondence.divisionId) : null;

  const getTemplateContext = (): Record<string, string> => {
    const divisionEntity = currentUser?.division ? getDivisionById(currentUser.division) : null;
    const departmentEntity = currentUser?.department ? getDepartmentById(currentUser.department) : null;
    const now = new Date();
    const userName = currentUser?.name ?? '';
    const initials = userName
      ? userName
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('')
      : '';
    return {
      name: userName,
      title: currentUser?.systemRole ?? '',
      gradeLevel: currentUser?.gradeLevel ?? '',
      division: divisionEntity?.name ?? '',
      department: departmentEntity?.name ?? '',
      initials,
      date: now.toLocaleDateString('en-US'),
      dateTime: now.toLocaleString('en-US'),
      referenceNumber: correspondence.referenceNumber ?? '',
    };
  };

  const renderTemplateText = (template: SignatureTemplate, context: Record<string, string>) => {
    let output = template.format;
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'gi');
      output = output.replace(regex, value ?? '');
    });
    return output;
  };

  const templateTypeForAction: SignatureTemplate['templateType'] = actionType === 'approve' ? 'approval' : 'minute';
  const relevantTemplates = signatureTemplates.filter(template => template.templateType === templateTypeForAction);
  const selectedTemplate = selectedTemplateId ? signatureTemplates.find(template => template.id === selectedTemplateId) ?? null : null;
  const templatePreview = selectedTemplate && applySignature
    ? renderTemplateText(selectedTemplate, getTemplateContext())
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Minute Correspondence
            {hasDraft && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Draft Loaded
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Add your comments and forward to the next level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Document Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{correspondence.subject}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>Ref: {correspondence.referenceNumber}</span>
                    <span>•</span>
                    <span>From: {correspondence.senderName}</span>
                    <span>•</span>
                    <span>{division?.name}</span>
                  </div>
                </div>
                <Badge variant={
                  correspondence.priority === 'urgent' ? 'destructive' :
                  correspondence.priority === 'high' ? 'default' :
                  'secondary'
                }>
                  {correspondence.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Previous Minute */}
          {previousMinute && previousUser && (
            <>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Previous Minute</Label>
                <Card className="bg-background">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {previousUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{previousUser.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {previousUser.systemRole}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{previousMinute.minuteText}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(previousMinute.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Separator />
            </>
          )}

          {/* Your Minute */}
          <div className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Minute templates</Label>
                <Select
                  value={selectedMinuteTemplateId ?? 'none'}
                  onValueChange={(value) => setSelectedMinuteTemplateId(value === 'none' ? null : value)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {filteredMinuteTemplates.length > 0 ? (
                      filteredMinuteTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__empty" disabled>
                        No templates available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyMinuteTemplate}
                  disabled={!selectedMinuteTemplate}
                >
                  Insert
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelectedMinuteTemplate}
                  disabled={!canDeleteSelectedTemplate}
                  className="text-destructive hover:text-destructive/80"
                >
                  Remove
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Name for new template"
                  className="w-full md:w-[240px]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveMinuteTemplate}
                  disabled={!minuteText.trim()}
                >
                  Save Template
                </Button>
              </div>
            </div>
            {selectedMinuteTemplate && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-sm">{selectedMinuteTemplate.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {selectedMinuteTemplate.scope === 'user'
                      ? 'Personal'
                      : selectedMinuteTemplate.scope === 'department'
                      ? 'Department'
                      : selectedMinuteTemplate.scope === 'division'
                      ? 'Division'
                      : selectedMinuteTemplate.scope === 'directorate'
                      ? 'Directorate'
                      : 'Organization'}
                  </Badge>
                </div>
                {selectedMinuteTemplate.description && (
                  <p className="text-[11px]">{selectedMinuteTemplate.description}</p>
                )}
                <p className="text-foreground text-[11px] leading-relaxed">
                  {getTemplatePlainText(selectedMinuteTemplate)}
                </p>
              </div>
            )}
            <Label htmlFor="minute">Your Minute *</Label>
            <Textarea
              id="minute"
              placeholder="Enter your comments, instructions, or recommendations..."
              value={minuteText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Use @ to mention others</span>
              <span>{characterCount} characters</span>
            </div>
          </div>

          {/* Direction Selection (for users below MD only) */}
          {canChooseDirection && (
            <div className="space-y-2">
              <Label>Direction *</Label>
              <RadioGroup value={selectedDirection} onValueChange={(v: any) => {
                setSelectedDirection(v);
                setForwardTo(''); // Reset forward to when direction changes
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upward" id="direction-upward" />
                  <Label htmlFor="direction-upward" className="font-normal cursor-pointer flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-success" />
                    Upward (Send to higher level)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="downward" id="direction-downward" />
                  <Label htmlFor="direction-downward" className="font-normal cursor-pointer flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-info" />
                    Downward (Send to lower level)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* MD Direction Info (read-only) */}
          {isMD && (
            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-info" />
                <span className="text-sm font-medium">Downward (MD can only send to lower levels)</span>
              </div>
            </div>
          )}

          {/* Action Type */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <RadioGroup value={actionType} onValueChange={(v: any) => setActionType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minute" id="minute-only" />
                <Label htmlFor="minute-only" className="font-normal cursor-pointer">
                  Minute (comment only)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="approve" id="approve-forward" />
                <Label htmlFor="approve-forward" className="font-normal cursor-pointer">
                  Approve & Forward
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Forward To */}
          <div className="space-y-2">
            <Label htmlFor="forwardTo">Forward To *</Label>
            <Select value={forwardTo} onValueChange={setForwardTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                {/* Search Input */}
                <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, role, or division..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {assistantList.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                      Assistant Team ({assistantList.length})
                    </div>
                    {assistantList.map((user) => {
                      const assignment = assistantAssignmentsById.get(user.id);
                      const assistantLabel = assignment?.type === 'TA' ? 'Technical Assistant' : 'Personal Assistant';
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {assistantLabel} • {user.systemRole}
                            </span>
                            {assignment?.permissions.length ? (
                              <span className="text-[11px] text-muted-foreground">
                                Permissions: {assignment.permissions.join(', ')}
                              </span>
                            ) : null}
                          </div>
                        </SelectItem>
                      );
                    })}
                    <Separator className="my-1" />
                  </>
                )}

                {isMD ? (
                  <>
                    {/* MD can see all lower-level users grouped by grade level */}
                    {(() => {
                      const gradeOrder = [...GRADE_LEVELS].sort((a, b) => b.level - a.level).map(g => g.code);
                      const mdGradeIndex = gradeOrder.indexOf('MDCS');
                      const lowerGrades = gradeOrder.slice(mdGradeIndex + 1);
                      
                      const filteredByGrade = lowerGrades.map(gradeCode => {
                        const gradeUsers = approverList.filter(u => u.gradeLevel === gradeCode);
                        if (gradeUsers.length === 0) return null;
                        
                        const gradeLevel = GRADE_LEVELS.find(g => g.code === gradeCode);
                        
                        return (
                          <div key={gradeCode}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary sticky top-[41px] bg-popover">
                              {gradeLevel?.name} ({gradeCode}) - {gradeUsers.length} user{gradeUsers.length !== 1 ? 's' : ''}
                            </div>
                            {gradeUsers.map(user => {
                              const userDivision = user.division ? getDivisionById(user.division) : null;
                              return (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.systemRole} {userDivision ? `- ${userDivision.name}` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                            <Separator className="my-1" />
                          </div>
                        );
                      }).filter(Boolean);
                      
                      if (searchQuery.trim() && filteredByGrade.length === 0) {
                        return (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No users found matching "{searchQuery}"
                          </div>
                        );
                      }
                      
                      return filteredByGrade;
                    })()}
                  </>
                ) : (
                  <>
                    {filteredNext && !searchQuery.trim() && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                          {nextIsAssistant ? 'Suggested Assistant' : 'Suggested Next'}
                        </div>
                        <SelectItem value={filteredNext.id}>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <div>
                              <p className="font-medium">{filteredNext?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {filteredNext?.systemRole} - {filteredNext?.gradeLevel}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                        <Separator className="my-1" />
                      </>
                    )}
                    
                    {approverList.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {searchQuery.trim() ? 'Search Results' : 'Alternative Recipients'} ({approverList.length})
                        </div>
                        {approverList.slice(0, 20).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.systemRole} - {user.gradeLevel}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No users found matching "{searchQuery}"
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
            {forwardTo && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                Will be forwarded to: {findUserById(forwardTo)?.name}
              </p>
            )}
          </div>

          {/* Digital Signature */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Digital Signature</Label>
              {actionType === 'approve' && (
                <Badge variant="destructive" className="text-[10px]">Required</Badge>
              )}
            </div>
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                {userSignature ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-medium text-foreground">Signature on File</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(userSignature.uploadedAt).toLocaleString()} {userSignature.fileName ? `• ${userSignature.fileName}` : ''}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg bg-background self-start">
                        <img
                          src={userSignature.imageData}
                          alt="Digital signature preview"
                          className="max-h-24 object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Signature Template</Label>
                      {relevantTemplates.length > 0 ? (
                        <Select
                          value={selectedTemplateId ?? undefined}
                          onValueChange={(value) => setSelectedTemplateId(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex flex-col text-xs">
                                  <span className="font-medium text-foreground text-sm">{template.name}</span>
                                  <span className="text-muted-foreground">{template.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 border border-dashed rounded bg-muted/30 text-xs text-muted-foreground">
                          No templates available for this action.
                        </div>
                      )}
                    </div>

                    {selectedTemplate && applySignature && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Template Preview</Label>
                        <div className="p-3 border border-dashed rounded bg-muted/20">
                          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{selectedTemplate.style}</Badge>
                          </div>
                          <p className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                            {templatePreview}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-destructive font-medium">No signature on file.</p>
                      <p>
                        Please upload your signature in{' '}
                        <Link href="/settings#signature" className="text-primary underline">
                          Settings → Signature
                        </Link>{' '}
                        before approving correspondence.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>
                      {actionType === 'approve'
                        ? 'A digital signature will be applied automatically for this approval.'
                        : 'Apply your signature to this minute for acknowledgement.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={applySignature && !!userSignature}
                      onCheckedChange={(checked) => {
                        if (actionType === 'approve') return;
                        setApplySignatureManuallySet(true);
                        setApplySignature(checked && !!userSignature);
                      }}
                      disabled={!userSignature || actionType === 'approve'}
                    />
                    <span className="text-xs">
                      {actionType === 'approve' ? 'Required' : applySignature && userSignature ? 'Will be applied' : 'Not applied'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution (CC) - Only for Management Level */}
          {canDistribute && (
            <>
              <Separator />
              <DistributionSelector
                selectedDistribution={distribution}
                onDistributionChange={setDistribution}
                currentDivisionId={correspondence.divisionId}
                currentDepartmentId={correspondence.departmentId}
              />
            </>
          )}

          {/* Preview */}
          {minuteText && forwardTo && (
            <Card className="bg-muted/30 border-accent/20">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold mb-2 block">Preview</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={(isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection)) === 'downward' ? 'default' : 'secondary'}>
                      {(isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection)) === 'downward' ? (
                        <>
                          <ArrowDown className="h-3 w-3 mr-1" />
                          Downward
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-3 w-3 mr-1" />
                          Upward
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {actionType === 'approve' ? 'Approve & Forward' : 'Minute Only'}
                    </Badge>
                    {applySignature && userSignature && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Signature Applied
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    <strong>{currentUser?.name}</strong> will minute and forward to{' '}
                    <strong>{findUserById(forwardTo)?.name}</strong>
                  </p>
                  {applySignature && userSignature && selectedTemplate && (
                    <p className="text-xs text-muted-foreground">
                      Signature template: {selectedTemplate.name}
                    </p>
                  )}
                  {actionType === 'approve' && !userSignature && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Upload your signature in Settings → Signature before approving.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
            >
              <Send className="h-4 w-4" />
              Send Minute
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirm}
          type="minute"
          data={{
            currentUserName: currentUser?.name ?? '',
            recipientName: findUserById(forwardTo)?.name || '',
            actionType,
            content: minuteText,
            direction: isMD ? 'downward' : (canChooseDirection ? selectedDirection : initialDirection),
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
