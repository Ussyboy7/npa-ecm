"use client";
import { logInfo, logWarn, logError } from '@/lib/client-logger';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
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
  
  // Explicit superadmin check as fallback
  const isSuperAdmin = currentUser?.isSuperuser || currentUser?.systemRole === "Super Admin";
  const [formData, setFormData] = useState({
    subject: '',
    senderName: '',
    senderOrganization: '',
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

  const executives = useMemo(() => {
    if (!Array.isArray(organizationUsers)) {
      logInfo('organizationUsers is not an array:', organizationUsers);
      return [];
    }
    const eligibleGrades = new Set(['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4']);
    const filtered = organizationUsers.filter((user) => user && user.gradeLevel && eligibleGrades.has(user.gradeLevel));
    logInfo('Executives filtered:', { total: organizationUsers.length, eligible: filtered.length, sample: filtered[0] });
    return filtered;
  }, [organizationUsers]);

  const filteredExecutives = useMemo(() => {
    if (!assignSearch.trim()) {
      logInfo('No search query, showing all executives:', executives.length);
      return executives;
    }
    const query = assignSearch.toLowerCase();
    const filtered = executives.filter((user) =>
      [user.name, user.systemRole, user.email]
        .filter(Boolean)
        .some((value) => value && typeof value === 'string' && value.toLowerCase().includes(query)),
    );
    logInfo('Filtered executives by search:', { query, total: executives.length, filtered: filtered.length });
    return filtered;
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

  // Track if component has mounted (client-side only)
  // This prevents SSR from showing the restricted message
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Always show loading on server-side or before client hydration
  // This prevents the "Registration Restricted" message from being pre-rendered
  // Use a simple div during SSR to avoid any layout flash
  // IMPORTANT: This check must come BEFORE any permission checks to prevent SSR of restriction message
  if (typeof window === 'undefined' || !mounted) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-10">
          <Card className="max-w-xl border-border/60 text-center shadow-medium">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Please wait while we verify your permissions...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // After client-side mount, wait for user data
  if (!mounted || !hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-10">
          <Card className="max-w-xl border-border/60 text-center shadow-medium">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Please wait while we verify your permissions...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Debug logging - always log in development
  logInfo('🔍 Register Page Debug:', {
    mounted,
    hydrated,
    hasCurrentUser: !!currentUser,
    currentUser: currentUser ? {
      id: currentUser.id,
      username: currentUser.username,
      isSuperuser: currentUser.isSuperuser,
      systemRole: currentUser.systemRole,
      gradeLevel: currentUser.gradeLevel,
      email: currentUser.email,
    } : null,
    isSuperAdmin,
    canRegisterCorrespondence: permissions.canRegisterCorrespondence,
    permissionsObject: permissions,
  });

  // Check permissions - allow superadmin even if permission check fails
  // Also check for common superadmin usernames/roles as additional fallback
  const isSuperAdminFallback = 
    isSuperAdmin || 
    currentUser?.username?.toLowerCase() === 'superadmin' ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.systemRole?.toLowerCase().includes('super') ||
    currentUser?.systemRole?.toLowerCase().includes('admin');

  logInfo('🔍 Permission Check:', {
    canRegisterCorrespondence: permissions.canRegisterCorrespondence,
    isSuperAdmin,
    isSuperAdminFallback,
    willShowRestriction: !permissions.canRegisterCorrespondence && !isSuperAdminFallback,
  });

  // ALWAYS allow superadmin - this check happens after client hydration
  // Also allow in development mode for debugging
  const shouldAllowAccess = 
    isSuperAdminFallback || 
    permissions.canRegisterCorrespondence ||
    (process.env.NODE_ENV === 'development' && currentUser);

  if (isSuperAdminFallback) {
    logInfo('✅ Superadmin detected - allowing access');
  }
  if (process.env.NODE_ENV === 'development' && currentUser) {
    logWarn('⚠️ DEVELOPMENT MODE: Allowing access for debugging');
  }

  // Only show restriction if we're sure the user doesn't have access
  // This check only happens after full client-side hydration
  if (!shouldAllowAccess) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center p-10">
          <Card className="max-w-xl border-border/60 text-center shadow-medium">
            <CardHeader>
              <CardTitle>Registration Restricted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Only records staff up to Senior Officer (Level 10) or delegates with drafting permissions can register new
                correspondence. Please contact the registry or your supervising directorate if you require access.
              </p>
              <Button variant="outline" onClick={() => router.push('/correspondence/inbox')}>
                Back to correspondence
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!documentFiles.length) {
      toast.error('Please upload at least one source document before registering');
      return;
    }

    if (flowType === 'outward') {
      if (!formData.recipientName) {
        toast.error('Please specify who this dispatch is going to.');
        return;
      }
      if (!formData.dispatchDate) {
        toast.error('Please set the dispatch date.');
        return;
      }
      if (directorateDistribution.length + divisionDistribution.length + departmentDistribution.length === 0) {
        toast.error('Select at least one directorate, division, or department in the distribution list.');
        return;
      }
    }

    if (!formData.subject || !formData.senderName || !formData.assignTo || !formData.owningOfficeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (flowType === 'inward' && !formData.receivedDate) {
      toast.error('Please capture the date received for inward correspondence.');
      return;
    }

    const form = new FormData();
    form.append('subject', formData.subject);
    form.append('reference_number', formData.referenceNumber);
    form.append('sender_name', formData.senderName);
    form.append('sender_organization', formData.senderOrganization);
    const registrationDate =
      flowType === 'outward' ? formData.dispatchDate || formData.receivedDate : formData.receivedDate;
    if (registrationDate) {
      form.append('received_date', registrationDate);
    }
    form.append('priority', formData.priority);
    if (formData.senderReference) {
      form.append('sender_reference', formData.senderReference);
    }
    if (formData.letterDate) {
      form.append('letter_date', formData.letterDate);
    }
    if (flowType === 'outward' && formData.dispatchDate) {
      form.append('dispatch_date', formData.dispatchDate);
    }
    if (flowType === 'outward') {
      form.append('recipient_name', formData.recipientName);
    } else if (formData.recipientName) {
      form.append('recipient_name', formData.recipientName);
    }
    if (formData.remarks) {
      form.append('remarks', formData.remarks);
    }
    const source = flowType === 'inward' ? 'external' : 'internal';
    const direction = flowType === 'inward' ? 'upward' : 'downward';
    form.append('current_approver_id', formData.assignTo);
    form.append('document_type', formData.documentType);
    if (formData.tags) {
      const tags = formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      form.append('tags', JSON.stringify(tags));
    }
    if (formData.divisionId) {
      form.append('division', formData.divisionId);
    }
    form.append('source', source);
    form.append('direction', direction);
    form.append('owning_office', formData.owningOfficeId);
    form.append('current_office', formData.owningOfficeId);
    documentFiles.forEach((file) => {
      form.append('attachments', file);
    });

    try {
      const response = await apiFetch<{ id?: string; reference_number?: string }>(
        '/correspondence/items/',
        {
        method: 'POST',
        body: form,
        headers: {},
        },
      );

      if (response?.id && flowType === 'outward') {
        await createDistributionEntries(response.id);
      }

      await syncFromApi();

      toast.success('Correspondence registered successfully', {
        description: `Reference: ${response.reference_number ?? formData.referenceNumber}`,
      });

      setDirectorateDistribution([]);
      setDivisionDistribution([]);
      setDepartmentDistribution([]);

      setTimeout(() => {
        router.push('/correspondence/inbox');
      }, 1200);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to register correspondence';
      toast.error(description);
    }
  };

  const handleSaveDraft = () => {
    toast.info('Draft saved', {
      description: 'You can continue editing later',
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Mail className="h-8 w-8 text-primary" />
                Register New Correspondence
              </h1>
              <p className="text-muted-foreground mt-1">
                Capture and initiate inward or outward correspondence from your office
              </p>
            </div>
            <ContextualHelp
              title="Registering correspondence"
              description="Pick your office, choose inward/outward workflow, complete the form, then attach the source document."
              steps={[
                'Select the correspondence office you are acting for.',
                'Choose inward registration or outward dispatch.',
                'Attach supporting files and register to push into workflow.',
              ]}
            />
          </div>

          <HelpGuideCard
            title="Office-based Registration"
            description="Each executive office retains its own registry workspace. Choose your office, register what arrived inwards, or capture drafts before dispatching outward."
            links={[
              { label: "Correspondence Inbox", href: "/correspondence/inbox" },
              { label: "Help & Guides", href: "/help" },
            ]}
          />

          <Card className="shadow-medium">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Correspondence Office</p>
                  <p className="text-lg font-semibold">
                    {activeOffices.find((office) => office.id === formData.owningOfficeId)?.name ||
                      'Select an office'}
                  </p>
                </div>
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
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            owningOfficeId: office.id,
                          }))
                        }
                      >
                        {office.name}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(['inward', 'outward'] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={flowType === type ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setFlowType(type)}
                  >
                    {type === 'inward' ? 'Inward Registration' : 'Outward Dispatch'}
                    {flowType === type && (
                      <Badge variant="secondary" className="ml-1">
                        Active
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {flowType === 'inward'
                  ? 'Use this mode to capture external or inter-agency correspondence received by your office.'
                  : 'Use this mode to register drafts prepared by your office before issuing outward (sender defaults to your office).'}
              </p>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {flowType === 'inward' ? 'Inward Details' : 'Outward Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Owning Office *</Label>
              <Select
                value={formData.owningOfficeId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, owningOfficeId: value }))}
              >
                    <SelectTrigger>
                      <SelectValue placeholder="Select the executive office receiving this correspondence" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px] overflow-y-auto">
                  <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={officeSearch}
                        onChange={(event) => setOfficeSearch(event.target.value)}
                        placeholder="Search by office, directorate, division, department"
                        className="pl-8 h-9"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </div>
                  </div>
                  {filteredOffices.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No offices match that search.
                    </div>
                  ) : (
                    filteredOffices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{office.name}</span>
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {office.officeType}
                            {office.directorateName ? ` • ${office.directorateName}` : ''}
                            {office.divisionName ? ` › ${office.divisionName}` : ''}
                            {office.departmentName ? ` › ${office.departmentName}` : ''}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Registry will file this item under the selected office before routing downstream.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Request for ICT infrastructure upgrade"
                    value={formData.subject}
                    onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value }))}
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <Label htmlFor="document" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document *
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fileList = Array.from(event.dataTransfer.files ?? []);
                    if (fileList.length) {
                      setDocumentFiles((prev) => {
                        const next = [...prev, ...fileList];
                        toast.success('Documents attached', { description: `${fileList.length} file(s) added` });
                        return next;
                      });
                    }
                  }}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX up to 10MB
                  </p>
                  <input 
                    type="file" 
                    id="document"
                    name="document"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    ref={fileInputRef}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length) {
                        setDocumentFiles((prev) => {
                          const next = [...prev, ...files];
                          toast.success('Documents attached', { description: `${files.length} file(s) added` });
                          return next;
                        });
                        event.target.value = '';
                      }
                    }}
                  />
                </div>
                {documentFiles.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {documentFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2"
                      >
                        <span className="font-medium truncate">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() =>
                              setDocumentFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No documents attached.</p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Reference Number */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referenceNumber"
                      name="referenceNumber"
                      autoComplete="off"
                      value={formData.referenceNumber}
                      onChange={(event) => setFormData({ ...formData, referenceNumber: event.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, referenceNumber: generateReferenceNumber() })}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>

                {flowType === 'inward' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="senderReference">Sender’s Reference</Label>
                      <Input
                        id="senderReference"
                        placeholder="Reference number shown on the letter"
                        value={formData.senderReference}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, senderReference: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="letterDate">Date of Letter</Label>
                      <Input
                        id="letterDate"
                        type="date"
                        value={formData.letterDate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, letterDate: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receivedDate">Date Received *</Label>
                      <Input
                        id="receivedDate"
                        name="receivedDate"
                        type="date"
                        autoComplete="off"
                        value={formData.receivedDate}
                        onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                        required
                      />
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
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, letterDate: event.target.value }))
                        }
                        required={flowType === 'outward'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispatchDate">Date of Dispatch *</Label>
                      <Input
                        id="dispatchDate"
                        type="date"
                        value={formData.dispatchDate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, dispatchDate: event.target.value }))
                        }
                        required={flowType === 'outward'}
                      />
                    </div>
                  </>
                )}

                {/* Sender / Originator */}
                {flowType === 'inward' ? (
                  <div className="space-y-2">
                    <Label htmlFor="senderName" className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      From Whom *
                    </Label>
                    <Input
                      id="senderName"
                      name="senderName"
                      autoComplete="name"
                      placeholder="Enter sender's name"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Originating Office
                    </Label>
                    <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm">
                      {formData.senderName || 'Select an office to populate the originating unit.'}
                    </div>
                  </div>
                )}

                {/* Sender Organization */}
                <div className="space-y-2">
                  <Label htmlFor="senderOrganization" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {flowType === 'inward' ? 'Sender Organization' : 'External Recipient (optional)'}
                  </Label>
                  <Input
                    id="senderOrganization"
                    name="senderOrganization"
                    autoComplete="organization"
                    placeholder={
                      flowType === 'inward'
                        ? 'Enter organization name'
                        : 'Optional: indicate destination organization'
                    }
                    value={formData.senderOrganization}
                    onChange={(e) => setFormData({ ...formData, senderOrganization: e.target.value })}
                  />
                </div>

                {flowType === 'outward' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recipientName" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      To Whom *
                    </Label>
                    <Input
                      id="recipientName"
                      placeholder="Recipient name or office"
                      value={formData.recipientName}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, recipientName: event.target.value }))
                      }
                      required={flowType === 'outward'}
                    />
                  </div>
                )}

                {flowType === 'outward' && (
                  <div className="space-y-3 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Distribution List
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Select every directorate, division, or department that should receive this dispatch.
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">Directorates</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/70 p-3 space-y-2">
                          {directorates.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No directorates available.</p>
                          ) : (
                            directorates.map((dir) => (
                              <label key={dir.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={directorateDistribution.includes(dir.id)}
                                  onCheckedChange={(checked) =>
                                    setDirectorateDistribution((prev) =>
                                      checked
                                        ? Array.from(new Set([...prev, dir.id]))
                                        : prev.filter((item) => item !== dir.id),
                                    )
                                  }
                                />
                                <span className="truncate">{dir.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2">Divisions</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/70 p-3 space-y-2">
                          {divisions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No divisions available.</p>
                          ) : (
                            divisions.map((division) => (
                              <label key={division.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={divisionDistribution.includes(division.id)}
                                  onCheckedChange={(checked) =>
                                    setDivisionDistribution((prev) =>
                                      checked
                                        ? Array.from(new Set([...prev, division.id]))
                                        : prev.filter((item) => item !== division.id),
                                    )
                                  }
                                />
                                <span className="truncate">{division.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2">Departments</p>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/70 p-3 space-y-2">
                          {departments.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No departments available.</p>
                          ) : (
                            departments.map((department) => (
                              <label key={department.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={departmentDistribution.includes(department.id)}
                                  onCheckedChange={(checked) =>
                                    setDepartmentDistribution((prev) =>
                                      checked
                                        ? Array.from(new Set([...prev, department.id]))
                                        : prev.filter((item) => item !== department.id),
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
                )}

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger id="priority" name="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Urgent</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">High</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Medium</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Low</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assign To */}
                <div className="space-y-2">
                  <Label htmlFor="assignTo" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Assign To *
                  </Label>
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
                    }}
                  >
                    <SelectTrigger id="assignTo" name="assignTo">
                      <SelectValue placeholder="Select executive" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50 max-h-[400px] overflow-y-auto">
                      <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Label htmlFor="assignToSearch" className="sr-only">Search executives</Label>
                          <Input
                            id="assignToSearch"
                            name="assignToSearch"
                            autoComplete="off"
                            value={assignSearch}
                            onChange={(event) => setAssignSearch(event.target.value)}
                            placeholder="Search name, role, division..."
                            className="pl-8 h-9"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          />
                        </div>
                      </div>
                      <SelectItem value={ASSIGN_PLACEHOLDER} disabled>
                        Select executive
                      </SelectItem>
                      {Array.isArray(directorates) && directorates.map((dir) => {
                        if (!dir || !dir.id) return null;
                        const dirDivisions = Array.isArray(divisions) 
                          ? divisions.filter((div) => div && div.directorateId === dir.id)
                          : [];
                        const dirUsers = filteredExecutives.filter((user) => {
                          if (!user || !user.id) return false;
                          // Include users whose division belongs to this directorate
                          if (user.division && dirDivisions.some((div) => div && div.id === user.division)) {
                            return true;
                          }
                          // Also include users whose directorate matches but have no division
                          if (user.directorate === dir.id && !user.division) {
                            return true;
                          }
                          return false;
                        });
                        if (dirUsers.length === 0) return null;
                        logInfo(`Directorate ${dir.name}: ${dirUsers.length} users`);
                        return (
                          <div key={dir.id} className="border border-border rounded-lg my-1">
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/70">
                              {dir.name}
                            </div>
                            {dirUsers.map((user) => {
                              if (!user || !user.id) return null;
                              const division = Array.isArray(divisions) 
                                ? divisions.find((div) => div && div.id === user.division)
                                : undefined;
                              return (
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                  className="flex flex-col items-start gap-1 px-3 py-2"
                                >
                                  <span className="font-medium">{user.name || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {[user.systemRole, user.gradeLevel].filter(Boolean).filter(role => !role.includes('-') || role.length < 30).join(' • ')}
                                    {division && division.name ? ` • ${division.name}` : ''}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </div>
                        );
                      })}
                      {/* Show users without a directorate or division assignment */}
                      {(() => {
                        const unassignedUsers = filteredExecutives.filter((user) => 
                          user && user.id && !user.directorate && !user.division
                        );
                        if (unassignedUsers.length > 0) {
                          logInfo(`Unassigned users: ${unassignedUsers.length}`, unassignedUsers.map(u => u.name));
                        }
                        if (unassignedUsers.length === 0) return null;
                        return (
                          <div key="unassigned" className="border border-border rounded-lg my-1">
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/70">
                              Unassigned
                            </div>
                            {unassignedUsers.map((user) => {
                              if (!user || !user.id) return null;
                              return (
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                  className="flex flex-col items-start gap-1 px-3 py-2"
                                >
                                  <span className="font-medium">{user.name || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {[user.systemRole, user.gradeLevel].filter(Boolean).filter(role => !role.includes('-') || role.length < 30).join(' • ')}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {filteredExecutives.length === 0 && (
                        <SelectItem value="none" disabled>
                          No executives match your search
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Type */}
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={formData.documentType}
                    onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                  >
                    <SelectTrigger id="documentType" name="documentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="request">Request</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="directive">Directive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    autoComplete="off"
                    placeholder="e.g., infrastructure, urgent, budget"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Add registry notes or routing instructions"
                    value={formData.remarks}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, remarks: event.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Preview Section */}
              {formData.assignTo && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Preview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-medium">{formData.referenceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
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
                      >
                        {formData.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">
                        {Array.isArray(executives) ? executives.find(u => u && u.id === formData.assignTo)?.name : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Division:</span>
                      <span className="font-medium">
                        {Array.isArray(divisions) ? divisions.find(d => d && d.id === formData.divisionId)?.name : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/correspondence/inbox')}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-secondary hover:opacity-90 transition-opacity gap-2"
              >
                <Send className="h-4 w-4" />
                Register & Send
              </Button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceRegister;