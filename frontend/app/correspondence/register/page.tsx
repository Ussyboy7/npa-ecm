"use client";
import { useMemo, useRef, useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import {
  Upload,
  FileText,
  Calendar,
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
  const { directorates, divisions, users: organizationUsers } = useOrganization();
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
    priority: 'medium',
    referenceNumber: generateReferenceNumber(),
    assignTo: '',
    divisionId: '',
    documentType: 'letter',
    tags: '',
  });
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ASSIGN_PLACEHOLDER = '__select_assign__';
  const [assignSearch, setAssignSearch] = useState('');

  const executives = useMemo(() => {
    if (!Array.isArray(organizationUsers)) return [];
    const eligibleGrades = new Set(['MDCS', 'EDCS', 'MSS1', 'MSS2', 'MSS3', 'MSS4']);
    return organizationUsers.filter((user) => user && user.gradeLevel && eligibleGrades.has(user.gradeLevel));
  }, [organizationUsers]);

  const filteredExecutives = useMemo(() => {
    if (!assignSearch.trim()) return executives;
    const query = assignSearch.toLowerCase();
    return executives.filter((user) =>
      [user.name, user.systemRole, user.email]
        .filter(Boolean)
        .some((value) => value && typeof value === 'string' && value.toLowerCase().includes(query)),
    );
  }, [executives, assignSearch]);

  // Track if component has mounted (client-side only)
  // This prevents SSR from showing the restricted message
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
  console.log('🔍 Register Page Debug:', {
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

  console.log('🔍 Permission Check:', {
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
    console.log('✅ Superadmin detected - allowing access');
  }
  if (process.env.NODE_ENV === 'development' && currentUser) {
    console.warn('⚠️ DEVELOPMENT MODE: Allowing access for debugging');
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

    if (!formData.subject || !formData.senderName || !formData.assignTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    const form = new FormData();
    form.append('subject', formData.subject);
    form.append('reference_number', formData.referenceNumber);
    form.append('sender_name', formData.senderName);
    form.append('sender_organization', formData.senderOrganization);
    form.append('received_date', formData.receivedDate);
    form.append('priority', formData.priority);
    form.append('current_approver_id', formData.assignTo);
    form.append('documentType', formData.documentType);
    if (formData.tags) {
      const tags = formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      form.append('tags', JSON.stringify(tags));
    }
    if (formData.divisionId) {
      form.append('division', formData.divisionId);
    }
    form.append('source', 'internal');
    documentFiles.forEach((file) => {
      form.append('attachments', file);
    });

    try {
      const response = await apiFetch<{ reference_number?: string }>('/correspondence/items/', {
        method: 'POST',
        body: form,
        headers: {},
      });

      await syncFromApi();

      toast.success('Correspondence registered successfully', {
        description: `Reference: ${response.reference_number ?? formData.referenceNumber}`,
      });

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
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Register New Correspondence
            </h1>
            <p className="text-muted-foreground mt-1">
              Capture and initiate new inbound or outbound correspondence
            </p>
          </div>
          <ContextualHelp
            title="Registering correspondence"
            description="Fill every required field, attach the source document, and select the first approver. The system generates the reference number automatically."
            steps={[
              'Capture sender details and document type.',
              'Choose the initial executive to receive the memo.',
              'Attach supporting files and register to push into workflow.'
            ]}
          />
        </div>

        <HelpGuideCard
          title="Register New Correspondence"
          description="Capture the subject, sender, priority, and routing details before handing the memo off to the appropriate directorate or division. Upload supporting files and assign next action owners."
          links={[
            { label: "Correspondence Inbox", href: "/correspondence/inbox" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <form onSubmit={handleSubmit}>
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Correspondence Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

                {/* Subject */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    autoComplete="off"
                    placeholder="Enter correspondence subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                {/* Sender Name */}
                <div className="space-y-2">
                  <Label htmlFor="senderName" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Sender Name *
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

                {/* Sender Organization */}
                <div className="space-y-2">
                  <Label htmlFor="senderOrganization" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Sender Organization
                  </Label>
                  <Input
                    id="senderOrganization"
                    name="senderOrganization"
                    autoComplete="organization"
                    placeholder="Enter organization name"
                    value={formData.senderOrganization}
                    onChange={(e) => setFormData({ ...formData, senderOrganization: e.target.value })}
                  />
                </div>

                {/* Date Received */}
                <div className="space-y-2">
                  <Label htmlFor="receivedDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Received
                  </Label>
                  <Input
                    id="receivedDate"
                    name="receivedDate"
                    type="date"
                    autoComplete="off"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  />
                </div>

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
                        const dirUsers = filteredExecutives.filter((user) =>
                          user && user.division && dirDivisions.some((div) => div && div.id === user.division),
                        );
                        if (dirUsers.length === 0) return null;
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
                                    {[user.systemRole, user.gradeLevel].filter(Boolean).join(' • ')}
                                    {division && division.name ? ` • ${division.name}` : ''}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </div>
                        );
                      })}
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
    </DashboardLayout>
  );
};

export default CorrespondenceRegister;
