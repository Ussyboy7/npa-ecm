"use client";

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { useTheme } from 'next-themes';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Moon,
  Sun,
  Monitor,
  Save,
  Mail,
  Lock,
  Image as ImageIcon,
  Trash2,
  Upload,
  AlertCircle,
  RefreshCcw,
  Pencil,
  X,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { loadUserSignature, saveUserSignature, deleteUserSignature, type StoredSignature, ensureDefaultSignatureTemplates, saveSignatureTemplates, loadUserSignaturePreferences, saveUserSignaturePreferences } from '@/lib/signature-storage';
import type { SignatureTemplate } from '@/lib/npa-structure';
import type { UserSignaturePreferences } from '@/lib/signature-storage';
import { MOCK_SIGNATURE_TEMPLATES } from '@/lib/npa-structure';

const MAX_SIGNATURE_SIZE_MB = 2;
type SignatureTemplateType = SignatureTemplate['templateType'];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    correspondence: true,
    approvals: true,
  });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signature, setSignature] = useState<StoredSignature | null>(null);
  const [signatureTemplates, setSignatureTemplates] = useState<SignatureTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<SignatureTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'signature'>('profile');

  const defaultPreferences: UserSignaturePreferences = {
    templateOverrides: {},
    autoApplyForMinutes: false,
  };

  const [signaturePreferences, setSignaturePreferences] = useState<UserSignaturePreferences>(defaultPreferences);
  const [initialPreferences, setInitialPreferences] = useState<UserSignaturePreferences>(defaultPreferences);

  const templateTypes: SignatureTemplateType[] = ['approval', 'minute', 'forward', 'treatment'];
  const hasPreferenceChanges = JSON.stringify(signaturePreferences) !== JSON.stringify(initialPreferences);

  useEffect(() => {
    const defaults = ensureDefaultSignatureTemplates();
    setSignatureTemplates(defaults);

    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('npa_demo_user_id') : null;
    if (savedUserId) {
      setCurrentUserId(savedUserId);
      const storedSignature = loadUserSignature(savedUserId);
      if (storedSignature) {
        setSignature(storedSignature);
      }
      const prefs = loadUserSignaturePreferences(savedUserId) ?? defaultPreferences;
      const normalizedPrefs: UserSignaturePreferences = {
        templateOverrides: { ...(prefs.templateOverrides ?? {}) },
        autoApplyForMinutes: prefs.autoApplyForMinutes ?? false,
      };
      setSignaturePreferences(normalizedPrefs);
      setInitialPreferences({
        templateOverrides: { ...normalizedPrefs.templateOverrides },
        autoApplyForMinutes: normalizedPrefs.autoApplyForMinutes,
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'notifications' || hash === 'appearance' || hash === 'security' || hash === 'signature' || hash === 'profile') {
      setActiveTab(hash as typeof activeTab);
    }
  }, []);

  const handleSaveProfile = () => {
    toast.success('Profile settings saved');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUserId) {
      toast.error('No active user context found');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, or SVG)');
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
      toast.error(`Signature file size must be ${MAX_SIGNATURE_SIZE_MB}MB or less`);
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await fileToBase64(file);
      const stored: StoredSignature = {
        imageData: base64,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      saveUserSignature(currentUserId, stored);
      setSignature(stored);
      toast.success('Signature uploaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload signature');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignatureDelete = () => {
    if (!currentUserId) return;
    deleteUserSignature(currentUserId);
    setSignature(null);
    toast.success('Signature removed');
  };

  const handleTemplateOverrideChange = (type: SignatureTemplateType, value: string) => {
    setSignaturePreferences(prev => {
      const overrides = { ...(prev.templateOverrides ?? {}) };
      if (value === '__organization__') {
        delete overrides[type];
      } else {
        overrides[type] = value;
      }
      return { ...prev, templateOverrides: overrides };
    });
  };

  const handleAutoApplyMinutesChange = (checked: boolean) => {
    setSignaturePreferences(prev => ({ ...prev, autoApplyForMinutes: checked }));
  };

  const handleSavePersonalPreferences = () => {
    if (!currentUserId) {
      toast.error('No active user context found');
      return;
    }
    const normalized: UserSignaturePreferences = {
      templateOverrides: { ...(signaturePreferences.templateOverrides ?? {}) },
      autoApplyForMinutes: signaturePreferences.autoApplyForMinutes ?? false,
    };
    saveUserSignaturePreferences(currentUserId, normalized);
    setSignaturePreferences(normalized);
    setInitialPreferences({
      templateOverrides: { ...normalized.templateOverrides },
      autoApplyForMinutes: normalized.autoApplyForMinutes,
    });
    toast.success('Personal signature preferences saved');
  };

  const handleResetPersonalPreferences = () => {
    if (!currentUserId) {
      toast.error('No active user context found');
      return;
    }
    const resetPrefs: UserSignaturePreferences = {
      templateOverrides: {},
      autoApplyForMinutes: false,
    };
    setSignaturePreferences(resetPrefs);
    setInitialPreferences({ ...resetPrefs, templateOverrides: {} });
    saveUserSignaturePreferences(currentUserId, resetPrefs);
    toast.success('Personal signature preferences reset');
  };

  const beginEditTemplate = (template: SignatureTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateDraft({ ...template });
  };

  const cancelEditTemplate = () => {
    setEditingTemplateId(null);
    setTemplateDraft(null);
  };

  const updateTemplateDraft = (field: keyof SignatureTemplate, value: string | boolean) => {
    if (!templateDraft) return;
    setTemplateDraft({ ...templateDraft, [field]: value } as SignatureTemplate);
  };

  const saveTemplateChanges = () => {
    if (!templateDraft) return;
    const updatedTemplates = signatureTemplates.map(template =>
      template.id === templateDraft.id ? templateDraft : template
    );
    setSignatureTemplates(updatedTemplates);
    saveSignatureTemplates(updatedTemplates);
    toast.success('Template updated');
    cancelEditTemplate();
  };

  const resetOrganizationTemplates = () => {
    saveSignatureTemplates(MOCK_SIGNATURE_TEMPLATES);
    setSignatureTemplates([...MOCK_SIGNATURE_TEMPLATES]);
    cancelEditTemplate();
    toast.success('Organization templates reset to defaults');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <HelpGuideCard
          title="Personalise Your Workspace"
          description="Update profile details, notifications, appearance, security options, and digital signature templates. Changes apply to the current persona stored in the Role Switcher."
          links={[
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        <Tabs value={activeTab} onValueChange={(tab: string) => {
          const newTab = tab as typeof activeTab;
          setActiveTab(newTab);
          if (typeof window !== 'undefined') {
            const { pathname } = window.location;
            const newHash = newTab === 'profile' ? '' : `#${newTab}`;
            window.history.replaceState(null, '', `${pathname}${newHash}`);
          }
        }} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="signature">
              <ImageIcon className="h-4 w-4 mr-2" />
              Signature
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="correspondence-notifications">Correspondence Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new correspondence
                    </p>
                  </div>
                  <Switch
                    id="correspondence-notifications"
                    checked={notifications.correspondence}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, correspondence: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="approvals-notifications">Approval Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about pending approvals
                    </p>
                  </div>
                  <Switch
                    id="approvals-notifications"
                    checked={notifications.approvals}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, approvals: checked })
                    }
                  />
                </div>
                <Button onClick={handleSaveNotifications} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Color Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-6 w-6" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-6 w-6" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="h-6 w-6" />
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
                <Button className="w-full sm:w-auto">
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Upload and manage your digital signature. A signature is required for all approvals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 border border-dashed rounded-lg bg-muted/30">
                  <AlertCircle className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Supported formats: <strong>PNG, JPG, SVG</strong> • Max size: <strong>{MAX_SIGNATURE_SIZE_MB}MB</strong>
                    </p>
                    <p>
                      Your signature will be stored locally for now and will migrate to secure backend storage when available.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signature-upload">Upload Signature</Label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Input
                        id="signature-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleSignatureUpload}
                        disabled={isUploading}
                      />
                      <Button variant="outline" className="gap-2" disabled={isUploading}>
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Select File'}
                      </Button>
                    </div>
                  </div>

                  {signature && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Current Signature</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(signature.uploadedAt).toLocaleString()} {signature.fileName ? `• ${signature.fileName}` : ''}
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={handleSignatureDelete}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg bg-background flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signature.imageData}
                          alt="Digital signature preview"
                          className="max-h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {!signature && (
                    <div className="p-4 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      No signature uploaded yet. Please add your signature to approve correspondence.
                    </div>
                  )}

                  <Tabs className="space-y-4" defaultValue="personal">
                    <TabsList>
                      <TabsTrigger value="personal">My Templates</TabsTrigger>
                      <TabsTrigger value="organization">Organization Templates</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal">
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                          Choose your preferred templates for each action. You can fall back to the organization default at any time.
                        </p>
                        <div className="space-y-4">
                          {templateTypes.map((type) => {
                            const templatesForType = signatureTemplates.filter(template => template.templateType === type);
                            const organizationDefault = signatureTemplates.find(template => template.templateType === type && template.defaultApply) ?? templatesForType[0] ?? null;
                            const selectedValue = signaturePreferences.templateOverrides?.[type] ?? '__organization__';
                            return (
                              <Card key={type} className="border-muted">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm capitalize">{type} Template</CardTitle>
                                  <CardDescription className="text-xs">
                                    {type === 'approval' && 'Used whenever you approve and forward correspondence.'}
                                    {type === 'minute' && 'Used when you leave a comment/minute without approving.'}
                                    {type === 'forward' && 'Used when you manually forward correspondence.'}
                                    {type === 'treatment' && 'Used when you treat/respond to correspondence.'}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {templatesForType.length > 0 ? (
                                    <Select
                                      value={selectedValue}
                                      onValueChange={(value) => handleTemplateOverrideChange(type, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select template" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__organization__">
                                          <div className="flex flex-col text-xs">
                                            <span className="font-medium text-foreground">Use organization default</span>
                                            <span className="text-muted-foreground">
                                              {organizationDefault ? organizationDefault.name : 'No default configured'}
                                            </span>
                                          </div>
                                        </SelectItem>
                                        {templatesForType.map(template => (
                                          <SelectItem key={template.id} value={template.id}>
                                            <div className="flex flex-col text-xs">
                                              <span className="font-medium text-foreground">{template.name}</span>
                                              <span className="text-muted-foreground">{template.description}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="p-3 border border-dashed rounded bg-muted/30 text-xs text-muted-foreground">
                                      No templates available for this action yet.
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={signaturePreferences.autoApplyForMinutes ?? false}
                              onCheckedChange={handleAutoApplyMinutesChange}
                            />
                            <span>Automatically apply signature to minutes (when not approving)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleResetPersonalPreferences} disabled={!hasPreferenceChanges || !currentUserId}>
                              Reset
                            </Button>
                            <Button size="sm" onClick={handleSavePersonalPreferences} disabled={!hasPreferenceChanges || !currentUserId}>
                              Save Preferences
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="organization">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          Organization-wide templates are the defaults applied across all users.
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" onClick={resetOrganizationTemplates}>
                          <RefreshCcw className="h-4 w-4" />
                          Reset to Default
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {signatureTemplates.map(template => {
                          const isEditing = editingTemplateId === template.id;
                          const draft = isEditing ? templateDraft : template;
                          return (
                            <Card key={template.id} className="border-muted">
                              <CardHeader className="space-y-1">
                                <div className="flex items-center justify-between">
                                  {isEditing ? (
                                    <Input
                                      value={draft?.name ?? ''}
                                      onChange={(e) => updateTemplateDraft('name', e.target.value)}
                                      className="text-sm font-semibold"
                                    />
                                  ) : (
                                    <CardTitle className="text-sm">{template.name}</CardTitle>
                                  )}
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {draft?.templateType}
                                  </Badge>
                                </div>
                                {isEditing ? (
                                  <Textarea
                                    value={draft?.description ?? ''}
                                    onChange={(e) => updateTemplateDraft('description', e.target.value)}
                                    className="text-xs"
                                    rows={2}
                                  />
                                ) : (
                                  <CardDescription className="text-xs">
                                    {template.description}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Format Preview</Label>
                                  {isEditing ? (
                                    <Textarea
                                      value={draft?.format ?? ''}
                                      onChange={(e) => updateTemplateDraft('format', e.target.value)}
                                      className="text-xs font-mono"
                                      rows={4}
                                    />
                                  ) : (
                                    <div className="p-3 rounded bg-muted/30 border border-dashed">
                                      <p className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                                        {template.format}
                                      </p>
                                    </div>
                                  )}
                                  {isEditing && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Use placeholders such as {'{name}'}, {'{title}'}, {'{gradeLevel}'}, {'{division}'}, {'{department}'}, {'{initials}'}, {'{date}'}, {'{dateTime}'}, {'{referenceNumber}'}.
                                    </p>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Template Type</Label>
                                    {isEditing ? (
                                      <Select
                                        value={draft?.templateType}
                                        onValueChange={(value) => updateTemplateDraft('templateType', value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="approval">Approval</SelectItem>
                                          <SelectItem value="minute">Minute</SelectItem>
                                          <SelectItem value="forward">Forward</SelectItem>
                                          <SelectItem value="treatment">Treatment</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="capitalize">{template.templateType}</span>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Style</Label>
                                    {isEditing ? (
                                      <Select
                                        value={draft?.style}
                                        onValueChange={(value) => updateTemplateDraft('style', value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="stamp">Stamp</SelectItem>
                                          <SelectItem value="formal">Formal</SelectItem>
                                          <SelectItem value="minimal">Minimal</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="capitalize">{template.style}</span>
                                    )}
                                  </div>
                                  <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <Label className="text-xs text-muted-foreground">Auto Apply</Label>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={draft?.defaultApply ?? false}
                                        onCheckedChange={(checked) => updateTemplateDraft('defaultApply', checked)}
                                        disabled={!isEditing}
                                      />
                                      <span className="text-xs">
                                        {draft?.defaultApply ? 'Automatically applied during workflow' : 'User can choose to apply manually'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground">ID: {template.id}</span>
                                  {isEditing ? (
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="gap-1" onClick={cancelEditTemplate}>
                                        <X className="h-3 w-3" />
                                        Cancel
                                      </Button>
                                      <Button size="sm" className="gap-1" onClick={saveTemplateChanges}>
                                        <Check className="h-3 w-3" />
                                        Save
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => beginEditTemplate(template)}>
                                      <Pencil className="h-3 w-3" />
                                      Edit Template
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

