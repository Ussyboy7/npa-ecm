"use client";
import { logInfo, logWarn, logError } from '@/lib/client-logger';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import {
  Upload,
  FileText,
  Building2,
  User as UserIcon,
  Mail,
  AlertCircle,
  Send,
  Save,
  Search,
  Loader2,
  Phone,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Trash2,
  RefreshCcw,
  CalendarDays,
  Tag,
  Users,
  FolderOpen,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { generateUUID } from '@/lib/utils';

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

const generateReferenceNumber = () => {
  const uuid = generateUUID();
  const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `NPA/REG/${new Date().getFullYear()}/${shortId}`;
};

type FormStep = 'basics' | 'sender' | 'routing' | 'documents';

const STEPS: { id: FormStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Basic Info', icon: <FileText className="h-4 w-4" /> },
  { id: 'sender', label: 'Parties', icon: <Users className="h-4 w-4" /> },
  { id: 'routing', label: 'Routing', icon: <ArrowRight className="h-4 w-4" /> },
  { id: 'documents', label: 'Documents', icon: <FolderOpen className="h-4 w-4" /> },
];

const CorrespondenceRegister = () => {
  const router = useRouter();
  const {
    directorates,
    divisions,
    departments,
    users: organizationUsers,
    offices,
    officeMemberships,
  } = useOrganization();
  const { syncFromApi } = useCorrespondence();
  const { currentUser, hydrated } = useCurrentUser();
  const permissions = useUserPermissions(currentUser);
  
  const isSuperAdmin = currentUser?.isSuperuser || currentUser?.systemRole === "Super Admin";
  const DRAFT_KEY = 'correspondence_register_draft';
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const [currentStep, setCurrentStep] = useState<FormStep>('basics');
  const [formData, setFormData] = useState({
    subject: '',
    senderName: '',
    senderOrganization: '',
    senderEmail: '',
    senderPhone: '',
    receivedDate: new Date().toISOString().split('T')[0],
    letterDate: '',
    dispatchDate: '',
    priority: 'medium',
    referenceNumber: generateReferenceNumber(),
    assignTo: '',
    divisionId: '',
    documentType: 'letter',
    tags: '',
    owningOfficeId: '',
    senderReference: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    remarks: '',
  });
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ASSIGN_PLACEHOLDER = '__select_assign__';
  const [assignSearch, setAssignSearch] = useState('');
  const owningOfficeId = formData.owningOfficeId;
  const [flowType, setFlowType] = useState<'inward' | 'outward'>('inward');
  const [directorateDistribution, setDirectorateDistribution] = useState<string[]>([]);
  const [divisionDistribution, setDivisionDistribution] = useState<string[]>([]);
  const [departmentDistribution, setDepartmentDistribution] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(false);

  const executives = useMemo(() => {
    if (!Array.isArray(organizationUsers)) {
      return [];
    }
    const eligibleGrades = new Set(['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4']);
    return organizationUsers.filter((user) => user && user.gradeLevel && eligibleGrades.has(user.gradeLevel));
  }, [organizationUsers]);

  const filteredExecutives = useMemo(() => {
    if (!assignSearch.trim()) {
      return executives;
    }
    const query = assignSearch.toLowerCase();
    return executives.filter((user) =>
      [user.name, user.systemRole, user.email]
        .filter(Boolean)
        .some((value) => value && typeof value === 'string' && value.toLowerCase().includes(query)),
    );
  }, [executives, assignSearch]);

  const [officeSearch, setOfficeSearch] = useState('');

  const directorateMap = useMemo(
    () => new Map(directorates.map((item) => [item.id, item.name])),
    [directorates],
  );

  const divisionMap = useMemo(
    () => new Map(divisions.map((item) => [item.id, item.name])),
    [divisions],
  );

  const departmentMap = useMemo(
    () => new Map(departments.map((item) => [item.id, item.name])),
    [departments],
  );

  const activeOffices = useMemo(
    () =>
      offices
        .filter((office) => office.isActive)
        .map((office) => ({
          ...office,
          directorateName: office.directorateId ? directorateMap.get(office.directorateId) : undefined,
          divisionName: office.divisionId ? divisionMap.get(office.divisionId) : undefined,
          departmentName: office.departmentId ? departmentMap.get(office.departmentId) : undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [offices, directorateMap, divisionMap, departmentMap],
  );

  const userOfficeMemberships = useMemo(
    () =>
      officeMemberships.filter(
        (membership) => membership.userId === currentUser?.id && membership.isActive,
      ),
    [officeMemberships, currentUser?.id],
  );

  const membershipOffices = useMemo(() => {
    const membershipOfficeIds = new Set(userOfficeMemberships.map((membership) => membership.officeId));
    return activeOffices.filter((office) => membershipOfficeIds.has(office.id));
  }, [activeOffices, userOfficeMemberships]);

  const filteredOffices = useMemo(() => {
    if (!officeSearch.trim()) {
      return membershipOffices;
    }
    const query = officeSearch.toLowerCase();
    return membershipOffices.filter((office) => {
      const candidates = [
        office.name,
        office.code,
        office.directorateName,
        office.divisionName,
        office.departmentName,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return candidates.some((candidate) => candidate.includes(query));
    });
  }, [membershipOffices, officeSearch]);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.flowType) setFlowType(draft.flowType);
        if (draft.formData) setFormData(draft.formData);
        if (draft.directorateDistribution) setDirectorateDistribution(draft.directorateDistribution);
        if (draft.divisionDistribution) setDivisionDistribution(draft.divisionDistribution);
        if (draft.departmentDistribution) setDepartmentDistribution(draft.departmentDistribution);
        setHasDraft(true);
        toast.info('Draft loaded', { description: 'You have unsaved changes from a previous session' });
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const draft = {
      flowType,
      formData,
      directorateDistribution,
      divisionDistribution,
      departmentDistribution,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setHasDraft(true);
  }, [formData, flowType, directorateDistribution, divisionDistribution, departmentDistribution, mounted]);

  useEffect(() => {
    if (!currentUser) return;
    if (owningOfficeId) return;
    const membership = officeMemberships.find(
      (item) => item.userId === currentUser.id && item.isPrimary && item.isActive,
    );
    if (membership?.officeId) {
      setFormData((prev) => ({ ...prev, owningOfficeId: membership.officeId ?? '' }));
    }
  }, [currentUser?.id, officeMemberships, owningOfficeId]);

  useEffect(() => {
    if (flowType !== 'outward') {
      setDirectorateDistribution([]);
      setDivisionDistribution([]);
      setDepartmentDistribution([]);
      setFormData((prev) => ({
        ...prev,
        dispatchDate: '',
        recipientName: '',
      }));
      return;
    }
    if (!owningOfficeId) return;
    const office = activeOffices.find((entry) => entry.id === owningOfficeId);
    if (!office) return;
    setFormData((prev) => {
      if (prev.senderName && prev.senderName !== '' && prev.senderName !== office.name) {
        return prev;
      }
      return { ...prev, senderName: office.name ?? prev.senderName };
    });
  }, [flowType, owningOfficeId, activeOffices]);

  const createDistributionEntries = useCallback(
    async (correspondenceId: string) => {
      const payloads = [
        ...directorateDistribution.map((id) => ({
          recipient_type: 'directorate' as const,
          directorate: id,
        })),
        ...divisionDistribution.map((id) => ({
          recipient_type: 'division' as const,
          division: id,
        })),
        ...departmentDistribution.map((id) => ({
          recipient_type: 'department' as const,
          department: id,
        })),
      ];
      if (!payloads.length) return;
      await Promise.all(
        payloads.map((payload) =>
          apiFetch('/correspondence/distribution/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              correspondence: correspondenceId,
              recipient_type: payload.recipient_type,
              directorate: payload.recipient_type === 'directorate' ? payload.directorate : undefined,
              division: payload.recipient_type === 'division' ? payload.division : undefined,
              department: payload.recipient_type === 'department' ? payload.department : undefined,
            }),
          }).catch((error) => {
            logError('Failed to create distribution entry', error);
            return null;
          }),
        ),
      );
    },
    [departmentDistribution, directorateDistribution, divisionDistribution],
  );

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    let completed = 0;
    let total = 0;

    // Required fields for all
    total += 4; // subject, senderName, assignTo, owningOfficeId
    if (formData.subject) completed++;
    if (formData.senderName) completed++;
    if (formData.assignTo) completed++;
    if (formData.owningOfficeId) completed++;

    // Flow-specific required fields
    if (flowType === 'inward') {
      total += 1; // receivedDate
      if (formData.receivedDate) completed++;
    } else {
      total += 3; // recipientName, dispatchDate, letterDate
      if (formData.recipientName) completed++;
      if (formData.dispatchDate) completed++;
      if (formData.letterDate) completed++;
    }

    // Documents
    total += 1;
    if (documentFiles.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [formData, flowType, documentFiles]);

  // Loading state
  if (typeof window === 'undefined' || !mounted) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
                <div className="h-96 bg-muted animate-pulse rounded-lg" />
              </div>
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!mounted || !hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying permissions...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Permission check
  const isSuperAdminFallback = 
    isSuperAdmin || 
    currentUser?.username?.toLowerCase() === 'superadmin' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.systemRole?.toLowerCase().includes('super') ||
    currentUser?.systemRole?.toLowerCase().includes('admin');

  const shouldAllowAccess = 
    isSuperAdminFallback || 
    permissions.canRegisterCorrespondence ||
    (process.env.NODE_ENV === 'development' && currentUser);

  if (!shouldAllowAccess) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card className="max-w-xl mx-auto">
            <CardHeader className="text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Registration Restricted</CardTitle>
              <CardDescription>
                Only records staff up to Senior Officer (Level 10) or delegates with drafting permissions can register new correspondence.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => router.push('/correspondence/inbox')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.senderName) newErrors.senderName = flowType === 'inward' ? 'Sender name is required' : 'Originating office is required';
    if (!formData.assignTo) newErrors.assignTo = 'Please assign to an executive';
    if (!formData.owningOfficeId) newErrors.owningOfficeId = 'Please select an owning office';
    
    if (flowType === 'inward') {
      if (!formData.receivedDate) newErrors.receivedDate = 'Date received is required';
    } else {
      if (!formData.recipientName) newErrors.recipientName = 'Recipient name is required';
      if (!formData.dispatchDate) newErrors.dispatchDate = 'Dispatch date is required';
      if (!formData.letterDate) newErrors.letterDate = 'Letter date is required';
      if (directorateDistribution.length + divisionDistribution.length + departmentDistribution.length === 0) {
        newErrors.distribution = 'Select at least one directorate, division, or department';
      }
    }
    
    if (!documentFiles.length) {
      newErrors.documentFiles = 'Please upload at least one source document';
    }

    if (formData.senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = 'Please enter a valid email address';
    }
    if (formData.recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail)) {
      newErrors.recipientEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File "${file.name}" exceeds 10MB limit`);
      return false;
    }
    const validTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      toast.error(`File "${file.name}" is not a valid type. Please upload PDF, DOC, or DOCX.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      // Navigate to the step with errors
      if (errors.subject || errors.owningOfficeId || errors.receivedDate || errors.letterDate || errors.dispatchDate) {
        setCurrentStep('basics');
      } else if (errors.senderName || errors.recipientName) {
        setCurrentStep('sender');
      } else if (errors.assignTo || errors.distribution) {
        setCurrentStep('routing');
      } else if (errors.documentFiles) {
        setCurrentStep('documents');
      }
      return;
    }

    setSubmitting(true);

    const form = new FormData();
    form.append('subject', formData.subject);
    form.append('reference_number', formData.referenceNumber);
    form.append('sender_name', formData.senderName);
    form.append('sender_organization', formData.senderOrganization);
    if (formData.senderEmail) form.append('sender_email', formData.senderEmail);
    if (formData.senderPhone) form.append('sender_phone', formData.senderPhone);
    
    const registrationDate = flowType === 'outward' ? formData.dispatchDate || formData.receivedDate : formData.receivedDate;
    if (registrationDate) form.append('received_date', registrationDate);
    
    form.append('priority', formData.priority);
    if (formData.senderReference) form.append('sender_reference', formData.senderReference);
    if (formData.letterDate) form.append('letter_date', formData.letterDate);
    if (flowType === 'outward' && formData.dispatchDate) form.append('dispatch_date', formData.dispatchDate);
    
    if (flowType === 'outward') {
      form.append('recipient_name', formData.recipientName);
      if (formData.recipientEmail) form.append('recipient_email', formData.recipientEmail);
      if (formData.recipientPhone) form.append('recipient_phone', formData.recipientPhone);
    } else if (formData.recipientName) {
      form.append('recipient_name', formData.recipientName);
    }
    
    if (formData.remarks) form.append('remarks', formData.remarks);
    
    const source = flowType === 'inward' ? 'external' : 'internal';
    const direction = flowType === 'inward' ? 'upward' : 'downward';
    form.append('current_approver_id', formData.assignTo);
    form.append('document_type', formData.documentType);
    if (formData.tags) {
      const tags = formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      form.append('tags', JSON.stringify(tags));
    }
    if (formData.divisionId) form.append('division', formData.divisionId);
    form.append('source', source);
    form.append('direction', direction);
    form.append('owning_office', formData.owningOfficeId);
    form.append('current_office', formData.owningOfficeId);
    documentFiles.forEach((file) => form.append('attachments', file));

    try {
      const response = await apiFetch<{ id?: string; reference_number?: string }>(
        '/correspondence/items/',
        { method: 'POST', body: form, headers: {} },
      );

      if (response?.id && flowType === 'outward') {
        await createDistributionEntries(response.id);
      }

      await syncFromApi();
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);

      // Reset form
      setFormData({
        subject: '',
        senderName: '',
        senderOrganization: '',
        senderEmail: '',
        senderPhone: '',
        receivedDate: new Date().toISOString().split('T')[0],
        letterDate: '',
        dispatchDate: '',
        priority: 'medium',
        referenceNumber: generateReferenceNumber(),
        assignTo: '',
        divisionId: '',
        documentType: 'letter',
        tags: '',
        owningOfficeId: formData.owningOfficeId,
        senderReference: '',
        recipientName: '',
        recipientEmail: '',
        recipientPhone: '',
        remarks: '',
      });
      setDocumentFiles([]);
      setDirectorateDistribution([]);
      setDivisionDistribution([]);
      setDepartmentDistribution([]);
      setErrors({});
      setCurrentStep('basics');

      const referenceNumber = response.reference_number ?? formData.referenceNumber;
      toast.success('Correspondence registered successfully', {
        description: `Reference: ${referenceNumber}`,
        action: {
          label: 'View',
          onClick: () => router.push(`/correspondence/${response.id}`),
        },
      });

      setTimeout(() => {
        router.push(`/correspondence/${response.id}`);
      }, 1500);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to register correspondence';
      toast.error(description);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    const draft = {
      flowType,
      formData,
      directorateDistribution,
      divisionDistribution,
      departmentDistribution,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setHasDraft(true);
    toast.success('Draft saved');
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setFormData({
      subject: '',
      senderName: '',
      senderOrganization: '',
      senderEmail: '',
      senderPhone: '',
      receivedDate: new Date().toISOString().split('T')[0],
      letterDate: '',
      dispatchDate: '',
      priority: 'medium',
      referenceNumber: generateReferenceNumber(),
      assignTo: '',
      divisionId: '',
      documentType: 'letter',
      tags: '',
      owningOfficeId: formData.owningOfficeId,
      senderReference: '',
      recipientName: '',
      recipientEmail: '',
      recipientPhone: '',
      remarks: '',
    });
    setDocumentFiles([]);
    setDirectorateDistribution([]);
    setDivisionDistribution([]);
    setDepartmentDistribution([]);
    setErrors({});
    toast.info('Draft cleared');
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const selectedOfficeName = activeOffices.find((office) => office.id === formData.owningOfficeId)?.name;
  const selectedAssigneeName = executives.find(u => u.id === formData.assignTo)?.name;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Register Correspondence</h1>
          <p className="text-muted-foreground mt-1">
            Capture and initiate inward or outward correspondence from your office
          </p>
        </div>

        <HelpGuideCard
          title="Office-based Registration"
          description="Each executive office retains its own registry workspace. Choose your office, register inward correspondence, or capture drafts before dispatching outward."
          links={[
            { label: "Correspondence Inbox", href: "/correspondence/inbox" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Office & Flow Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Correspondence Office</CardTitle>
                <CardDescription>Select which office is registering this item</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {membershipOffices.length === 0 ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      No office membership detected
                    </Badge>
                  ) : (
                    membershipOffices.map((office) => (
                      <Button
                        key={office.id}
                        type="button"
                        variant={formData.owningOfficeId === office.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData((prev) => ({ ...prev, owningOfficeId: office.id }))}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        {office.name}
                      </Button>
                    ))
                  )}
                </div>
                {errors.owningOfficeId && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.owningOfficeId}
                  </p>
                )}

                <Separator />

                <div className="flex gap-2">
                  {(['inward', 'outward'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={flowType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFlowType(type)}
                      className="flex-1"
                    >
                      {type === 'inward' ? (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Inward
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Outward
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {flowType === 'inward'
                    ? 'Capture external or inter-agency correspondence received by your office.'
                    : 'Register drafts prepared by your office before dispatching outward.'}
                </p>
              </CardContent>
            </Card>

            {/* Form Steps */}
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Registration Details</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{completionPercentage}% complete</span>
                    </div>
                  </div>
                  <Progress value={completionPercentage} className="h-1" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as FormStep)}>
                    <TabsList className="grid w-full grid-cols-4">
                      {STEPS.map((step) => (
                        <TabsTrigger key={step.id} value={step.id} className="gap-2">
                          {step.icon}
                          <span className="hidden sm:inline">{step.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basics" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="subject">Subject *</Label>
                          <Input
                            id="subject"
                            placeholder="e.g. Request for ICT infrastructure upgrade"
                            value={formData.subject}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, subject: e.target.value }));
                              if (errors.subject) setErrors(prev => ({ ...prev, subject: '' }));
                            }}
                            className={errors.subject ? 'border-destructive' : ''}
                          />
                          {errors.subject && (
                            <p className="text-xs text-destructive">{errors.subject}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="referenceNumber">Reference Number</Label>
                          <div className="flex gap-2">
                            <Input
                              id="referenceNumber"
                              value={formData.referenceNumber}
                              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setFormData({ ...formData, referenceNumber: generateReferenceNumber() })}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => setFormData({ ...formData, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">
                                <div className="flex items-center gap-2">
                                  <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                                  Urgent
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center gap-2">
                                  <Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" />
                                  High
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center gap-2">
                                  <Badge className="h-2 w-2 p-0 rounded-full bg-yellow-500" />
                                  Medium
                                </div>
                              </SelectItem>
                              <SelectItem value="low">
                                <div className="flex items-center gap-2">
                                  <Badge className="h-2 w-2 p-0 rounded-full bg-green-500" />
                                  Low
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="documentType">Document Type</Label>
                          <Select
                            value={formData.documentType}
                            onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="letter">Letter</SelectItem>
                              <SelectItem value="request">Request</SelectItem>
                              <SelectItem value="complaint">Complaint</SelectItem>
                              <SelectItem value="inquiry">Inquiry</SelectItem>
                              <SelectItem value="report">Report</SelectItem>
                              <SelectItem value="directive">Directive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {flowType === 'inward' ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="senderReference">Sender's Reference</Label>
                              <Input
                                id="senderReference"
                                placeholder="Reference on the letter"
                                value={formData.senderReference}
                                onChange={(e) => setFormData((prev) => ({ ...prev, senderReference: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="letterDate">Date of Letter</Label>
                              <Input
                                id="letterDate"
                                type="date"
                                value={formData.letterDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, letterDate: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="receivedDate">Date Received *</Label>
                              <Input
                                id="receivedDate"
                                type="date"
                                value={formData.receivedDate}
                                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                                className={errors.receivedDate ? 'border-destructive' : ''}
                              />
                              {errors.receivedDate && (
                                <p className="text-xs text-destructive">{errors.receivedDate}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="letterDate">Date of Letter *</Label>
                              <Input
                                id="letterDate"
                                type="date"
                                value={formData.letterDate}
                                onChange={(e) => {
                                  setFormData((prev) => ({ ...prev, letterDate: e.target.value }));
                                  if (errors.letterDate) setErrors(prev => ({ ...prev, letterDate: '' }));
                                }}
                                className={errors.letterDate ? 'border-destructive' : ''}
                              />
                              {errors.letterDate && (
                                <p className="text-xs text-destructive">{errors.letterDate}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dispatchDate">Date of Dispatch *</Label>
                              <Input
                                id="dispatchDate"
                                type="date"
                                value={formData.dispatchDate}
                                onChange={(e) => {
                                  setFormData((prev) => ({ ...prev, dispatchDate: e.target.value }));
                                  if (errors.dispatchDate) setErrors(prev => ({ ...prev, dispatchDate: '' }));
                                }}
                                className={errors.dispatchDate ? 'border-destructive' : ''}
                              />
                              {errors.dispatchDate && (
                                <p className="text-xs text-destructive">{errors.dispatchDate}</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button type="button" onClick={goToNextStep}>
                          Next: Parties
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Sender/Recipient Tab */}
                    <TabsContent value="sender" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {flowType === 'inward' ? (
                          <>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="senderName">From Whom *</Label>
                              <Input
                                id="senderName"
                                placeholder="Enter sender's name"
                                value={formData.senderName}
                                onChange={(e) => {
                                  setFormData({ ...formData, senderName: e.target.value });
                                  if (errors.senderName) setErrors(prev => ({ ...prev, senderName: '' }));
                                }}
                                className={errors.senderName ? 'border-destructive' : ''}
                              />
                              {errors.senderName && (
                                <p className="text-xs text-destructive">{errors.senderName}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="senderOrganization">Sender Organization</Label>
                              <Input
                                id="senderOrganization"
                                placeholder="Organization name"
                                value={formData.senderOrganization}
                                onChange={(e) => setFormData({ ...formData, senderOrganization: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="senderEmail">Sender Email</Label>
                              <Input
                                id="senderEmail"
                                type="email"
                                placeholder="sender@example.com"
                                value={formData.senderEmail}
                                onChange={(e) => {
                                  setFormData({ ...formData, senderEmail: e.target.value });
                                  if (errors.senderEmail) setErrors(prev => ({ ...prev, senderEmail: '' }));
                                }}
                                className={errors.senderEmail ? 'border-destructive' : ''}
                              />
                              {errors.senderEmail && (
                                <p className="text-xs text-destructive">{errors.senderEmail}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="senderPhone">Sender Phone</Label>
                              <Input
                                id="senderPhone"
                                type="tel"
                                placeholder="+234 123 456 7890"
                                value={formData.senderPhone}
                                onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Originating Office</Label>
                              <div className="p-3 rounded-lg bg-muted/50 border">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{formData.senderName || 'Select an office above'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="recipientName">To Whom *</Label>
                              <Input
                                id="recipientName"
                                placeholder="Recipient name or office"
                                value={formData.recipientName}
                                onChange={(e) => {
                                  setFormData((prev) => ({ ...prev, recipientName: e.target.value }));
                                  if (errors.recipientName) setErrors(prev => ({ ...prev, recipientName: '' }));
                                }}
                                className={errors.recipientName ? 'border-destructive' : ''}
                              />
                              {errors.recipientName && (
                                <p className="text-xs text-destructive">{errors.recipientName}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="recipientEmail">Recipient Email</Label>
                              <Input
                                id="recipientEmail"
                                type="email"
                                placeholder="recipient@example.com"
                                value={formData.recipientEmail}
                                onChange={(e) => {
                                  setFormData({ ...formData, recipientEmail: e.target.value });
                                  if (errors.recipientEmail) setErrors(prev => ({ ...prev, recipientEmail: '' }));
                                }}
                                className={errors.recipientEmail ? 'border-destructive' : ''}
                              />
                              {errors.recipientEmail && (
                                <p className="text-xs text-destructive">{errors.recipientEmail}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="recipientPhone">Recipient Phone</Label>
                              <Input
                                id="recipientPhone"
                                type="tel"
                                placeholder="+234 123 456 7890"
                                value={formData.recipientPhone}
                                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="senderOrganization">External Recipient Org</Label>
                              <Input
                                id="senderOrganization"
                                placeholder="Destination organization (optional)"
                                value={formData.senderOrganization}
                                onChange={(e) => setFormData({ ...formData, senderOrganization: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={goToPrevStep}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                        <Button type="button" onClick={goToNextStep}>
                          Next: Routing
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Routing Tab */}
                    <TabsContent value="routing" className="space-y-4 pt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Assign To *</Label>
                          <Select
                            value={formData.assignTo || ASSIGN_PLACEHOLDER}
                            onValueChange={(value) => {
                              if (value === ASSIGN_PLACEHOLDER) {
                                setFormData({ ...formData, assignTo: '', divisionId: '' });
                                return;
                              }
                              const user = executives.find((u) => u.id === value);
                              setFormData({
                                ...formData,
                                assignTo: value,
                                divisionId: user?.division || '',
                              });
                              if (errors.assignTo) setErrors(prev => ({ ...prev, assignTo: '' }));
                            }}
                          >
                            <SelectTrigger className={errors.assignTo ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Select executive" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px]">
                              <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={assignSearch}
                                    onChange={(e) => setAssignSearch(e.target.value)}
                                    placeholder="Search name, role..."
                                    className="pl-8 h-9"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <SelectItem value={ASSIGN_PLACEHOLDER} disabled>
                                Select executive
                              </SelectItem>
                              {directorates.map((dir) => {
                                if (!dir?.id) return null;
                                const dirDivisions = divisions.filter((div) => div?.directorateId === dir.id);
                                const dirUsers = filteredExecutives.filter((user) => {
                                  if (!user?.id) return false;
                                  if (user.division && dirDivisions.some((div) => div?.id === user.division)) return true;
                                  if (user.directorate === dir.id && !user.division) return true;
                                  return false;
                                });
                                if (dirUsers.length === 0) return null;
                                return (
                                  <div key={dir.id} className="border-t first:border-t-0">
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                                      {dir.name}
                                    </div>
                                    {dirUsers.map((user) => {
                                      const division = divisions.find((div) => div?.id === user.division);
                                      return (
                                        <SelectItem key={user.id} value={user.id}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {[user.systemRole, user.gradeLevel, division?.name].filter(Boolean).join(' • ')}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {(() => {
                                const unassigned = filteredExecutives.filter((u) => u?.id && !u.directorate && !u.division);
                                if (unassigned.length === 0) return null;
                                return (
                                  <div className="border-t">
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                                      Unassigned
                                    </div>
                                    {unassigned.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{user.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {[user.systemRole, user.gradeLevel].filter(Boolean).join(' • ')}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                );
                              })()}
                            </SelectContent>
                          </Select>
                          {errors.assignTo && (
                            <p className="text-xs text-destructive">{errors.assignTo}</p>
                          )}
                        </div>

                        {flowType === 'outward' && (
                          <div className="space-y-4">
                            <Separator />
                            <div>
                              <Label className="text-base">Distribution List</Label>
                              <p className="text-sm text-muted-foreground mb-4">
                                Select units that should receive this dispatch
                              </p>
                              {errors.distribution && (
                                <p className="text-sm text-destructive mb-2">{errors.distribution}</p>
                              )}
                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Directorates</p>
                                  <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                                    {directorates.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No directorates</p>
                                    ) : (
                                      directorates.map((dir) => (
                                        <label key={dir.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                                          <Checkbox
                                            checked={directorateDistribution.includes(dir.id)}
                                            onCheckedChange={(checked) =>
                                              setDirectorateDistribution((prev) =>
                                                checked ? [...prev, dir.id] : prev.filter((item) => item !== dir.id),
                                              )
                                            }
                                          />
                                          <span className="truncate">{dir.name}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Divisions</p>
                                  <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                                    {divisions.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No divisions</p>
                                    ) : (
                                      divisions.map((division) => (
                                        <label key={division.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                                          <Checkbox
                                            checked={divisionDistribution.includes(division.id)}
                                            onCheckedChange={(checked) =>
                                              setDivisionDistribution((prev) =>
                                                checked ? [...prev, division.id] : prev.filter((item) => item !== division.id),
                                              )
                                            }
                                          />
                                          <span className="truncate">{division.name}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Departments</p>
                                  <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                                    {departments.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No departments</p>
                                    ) : (
                                      departments.map((department) => (
                                        <label key={department.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                                          <Checkbox
                                            checked={departmentDistribution.includes(department.id)}
                                            onCheckedChange={(checked) =>
                                              setDepartmentDistribution((prev) =>
                                                checked ? [...prev, department.id] : prev.filter((item) => item !== department.id),
                                              )
                                            }
                                          />
                                          <span className="truncate">{department.name}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={goToPrevStep}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                        <Button type="button" onClick={goToNextStep}>
                          Next: Documents
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="space-y-4 pt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Upload Documents *</Label>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                fileInputRef.current?.click();
                              }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const fileList = Array.from(e.dataTransfer.files ?? []).filter(validateFile);
                              if (fileList.length) {
                                setDocumentFiles((prev) => [...prev, ...fileList]);
                                if (errors.documentFiles) setErrors(prev => ({ ...prev, documentFiles: '' }));
                                toast.success(`${fileList.length} file(s) added`);
                              }
                            }}
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                              ${errors.documentFiles ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-muted/50 hover:border-primary/50'}`}
                          >
                            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PDF, DOC, DOCX up to 10MB</p>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              ref={fileInputRef}
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files ?? []).filter(validateFile);
                                if (files.length) {
                                  setDocumentFiles((prev) => [...prev, ...files]);
                                  if (errors.documentFiles) setErrors(prev => ({ ...prev, documentFiles: '' }));
                                  toast.success(`${files.length} file(s) added`);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                          {errors.documentFiles && (
                            <p className="text-xs text-destructive">{errors.documentFiles}</p>
                          )}
                        </div>

                        {documentFiles.length > 0 && (
                          <div className="space-y-2">
                            <Label>Attached Files ({documentFiles.length})</Label>
                            <div className="space-y-2">
                              {documentFiles.map((file, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <div>
                                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDocumentFiles((prev) => prev.filter((_, i) => i !== index))}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="tags">Tags</Label>
                            <Input
                              id="tags"
                              placeholder="e.g. infrastructure, urgent, budget (comma-separated)"
                              value={formData.tags}
                              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            />
                            {formData.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {formData.tags.split(',').map((tag, i) => tag.trim() && (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="remarks">Remarks</Label>
                            <Textarea
                              id="remarks"
                              placeholder="Add registry notes or routing instructions"
                              value={formData.remarks}
                              onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={goToPrevStep}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Register & Send
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Office</span>
                    <span className="font-medium text-right max-w-[150px] truncate">
                      {selectedOfficeName || '—'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Flow</span>
                    <Badge variant={flowType === 'inward' ? 'default' : 'secondary'}>
                      {flowType === 'inward' ? 'Inward' : 'Outward'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-xs text-right max-w-[150px] truncate">
                      {formData.referenceNumber}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge
                      variant={
                        formData.priority === 'urgent' ? 'destructive' :
                        formData.priority === 'high' ? 'default' :
                        formData.priority === 'low' ? 'outline' : 'secondary'
                      }
                    >
                      {formData.priority}
                    </Badge>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Assigned to</span>
                    <span className="font-medium text-right max-w-[150px] truncate">
                      {selectedAssigneeName || '—'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground">Documents</span>
                    <div className="flex items-center gap-1">
                      {documentFiles.length > 0 ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{documentFiles.length} file(s)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">None</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSaveDraft}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  {hasDraft && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={handleClearDraft}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Draft
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/correspondence/inbox')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  My Inbox
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/correspondence/registered')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Registered Items
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/dms')}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Document Management
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceRegister;
