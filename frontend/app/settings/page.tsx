"use client";

import { logError } from '@/lib/client-logger';
import { ALLOWED_IMAGE_MIME_TYPES } from '@/lib/file-types';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { appType } from '@/lib/app-type';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import dynamic from 'next/dynamic';

const PasswordDialog = dynamic(() => import('@/components/settings/PasswordDialog').then(mod => ({ default: mod.PasswordDialog })), { ssr: false });
const ProfileSection = dynamic(() => import('@/components/settings/ProfileSection').then(mod => ({ default: mod.ProfileSection })), { ssr: false });
const NotificationsSection = dynamic(() => import('@/components/settings/NotificationsSection').then(mod => ({ default: mod.NotificationsSection })), { ssr: false });
const AppearanceSection = dynamic(() => import('@/components/settings/AppearanceSection').then(mod => ({ default: mod.AppearanceSection })), { ssr: false });
const SecuritySection = dynamic(() => import('@/components/settings/SecuritySection').then(mod => ({ default: mod.SecuritySection })), { ssr: false });
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Mail,
  Image as ImageIcon,
  RefreshCcw,
  Check,
  Loader2,
  Smartphone,
  Key,
  Copy,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiFetch } from '@/lib/api-client';
import { SignatureSettingsCard } from '@/components/settings/SignatureSettingsCard';
import {
  getNotificationPreferences,
  type NotificationPreferences as NotificationPreferencesType,
} from '@/lib/notifications-storage';
import {
  MAX_PHOTO_SIZE_MB,
  fileToBase64,
  validateEmail,
  validatePhone,
  generateBackupCodes,
  convertBackendToFrontend,
  convertFrontendToBackend,
} from './settings-utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, refresh: refreshUser } = useCurrentUser();
  
  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    jobTitle: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'email_otp'>('totp');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferencesType | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'signature' | 'delegation'>('profile');

  // Initialize profile from currentUser (already fetched by useCurrentUser)
  useEffect(() => {
    if (currentUser) {
      setProfile({
        firstName: currentUser.name?.split(' ').slice(0, -1).join(' ') || '',
        lastName: currentUser.name?.split(' ').pop() || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        jobTitle: currentUser.jobTitle || currentUser.systemRole || '',
      });
      if (currentUser.profilePhoto) {
        setProfilePhoto(currentUser.profilePhoto);
      }
    }
  }, [currentUser]);

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {

      
      setIsLoadingNotifications(true);
      try {
        const prefs = await getNotificationPreferences();
        if (prefs) {
          const converted = convertBackendToFrontend(prefs as unknown as Record<string, unknown>);
          if (converted) {
            setNotificationPrefs(converted);
          }
        }
      } catch (error: unknown) {
        logError('Failed to load notification preferences', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoadingNotifications(false);
      }
    };
    
    void loadNotificationPreferences();
    // only runs once on mount
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'notifications' || hash === 'appearance' || hash === 'security' || hash === 'signature' || hash === 'profile') {
      setActiveTab(hash as typeof activeTab);
    }
  }, [setActiveTab]);

  const handleProfileChange = useCallback((field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setProfileErrors(prev => {
      if (prev[field]) return { ...prev, [field]: '' };
      return prev;
    });
  }, []);

  // Profile photo upload
  const handleNotificationRetry = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const prefs = await getNotificationPreferences();
      if (prefs) setNotificationPrefs(convertBackendToFrontend(prefs as unknown as Record<string, unknown>));
    } catch (error: unknown) {
      logError('Failed to reload preferences', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  const handleNotificationPrefChange = useCallback((field: string, value: boolean | string | number) => {
    if (notificationPrefs) {
      setNotificationPrefs({ ...notificationPrefs, [field]: value });
    }
  }, [notificationPrefs]);

  const handleSetup2FADialogChange = useCallback((open: boolean) => setShowSetup2FA(open), []);
  const handleBackupCodesDialogChange = useCallback((open: boolean) => setShowBackupCodes(open), []);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, or WebP)');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo must be ${MAX_PHOTO_SIZE_MB}MB or less`);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const base64 = await fileToBase64(file);
      setProfilePhoto(base64);
      toast.success('Profile photo updated');
    } catch (error: unknown) {
      logError('Failed to upload photo', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    const errors: Record<string, string> = {};
    const emailError = validateEmail(profile.email);
    if (emailError) errors.email = emailError;
    
    const phoneError = validatePhone(profile.phone);
    if (phoneError) errors.phone = phoneError;
    
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error('Please fix the errors before saving');
      return;
    }
    
    setProfileErrors({});
    setIsSavingProfile(true);
    
    try {
      await apiFetch('/accounts/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: profile.firstName,
          last_name: profile.lastName,
          email: profile.email,
          bio: profile.bio,
        }),
      });
      
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      logError('Failed to save profile', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notificationPrefs) {
      toast.error('Notification preferences not loaded');
      return;
    }
    
    setIsSavingNotifications(true);
    
    try {
      const backendData = convertFrontendToBackend(notificationPrefs);
      const response = await apiFetch('/notifications/preferences/', {
        method: 'PUT',
        body: JSON.stringify(backendData),
      });
      const converted = convertBackendToFrontend(response as Record<string, unknown>);
      if (converted) {
        setNotificationPrefs(converted);
      }
      toast.success('Notification preferences saved');
    } catch (error: unknown) {
      logError('Failed to save notification preferences', error);
      toast.error('Failed to save notification preferences. Please try again.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Load 2FA status
  useEffect(() => {
    const load2FAStatus = async () => {
      if (!currentUser) {
        setIsLoading2FAStatus(false);
        return;
      }
      
      try {
        const status = await apiFetch<{
          require_2fa: boolean;
          totp_enabled: boolean;
          totp_confirmed: boolean;
          preferred_method: 'email' | 'totp';
          email: string;
          has_email: boolean;
          available_methods: string[];
        }>('/accounts/2fa/status/');
        
        // Email OTP is considered "enabled" if user has email
        setOtpEnabled(status.has_email);
        setTotpEnabled(status.totp_enabled && status.totp_confirmed);
        setTwoFactorEnabled(status.require_2fa && (status.has_email || status.totp_confirmed));
      } catch (error: unknown) {
        logError('Failed to load 2FA status', error);
      } finally {
        setIsLoading2FAStatus(false);
      }
    };
    
    void load2FAStatus();
  }, [currentUser]);

  // OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // 2FA handlers
  const handleSetup2FA = async (method: 'totp' | 'email_otp') => {
    setTwoFactorMethod(method);
    setVerificationCode('');
    setOtpSent(false);
    
    if (method === 'totp') {
      try {
        setIsEnabling2FA(true);
        const response = await apiFetch<{
          secret: string;
          provisioning_uri: string;
          qr_code_data: string;
        }>('/accounts/2fa/totp/setup/', { method: 'POST' });
        
        setTwoFactorSecret(response.secret);
        setTwoFactorQRCode(response.qr_code_data);
        setShowSetup2FA(true);
      } catch (error: unknown) {
        logError('Failed to setup TOTP', error);
        toast.error('Failed to setup authenticator app. Please try again.');
      } finally {
        setIsEnabling2FA(false);
      }
    } else {
      // Email OTP - just show the dialog
      setShowSetup2FA(true);
    }
  };

  const handleSendEmailOTP = async () => {
    try {
      setIsEnabling2FA(true);
      await apiFetch('/accounts/2fa/email/request/', { method: 'POST' });
      setOtpSent(true);
      setOtpCountdown(60); // 60 second countdown
      toast.success('OTP sent to your email');
    } catch (error: unknown) {
      logError('Failed to send OTP', error);
      toast.error((error instanceof Error ? error.message : 'Failed to send OTP. Please try again.'));
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsEnabling2FA(true);
    try {
      const endpoint = twoFactorMethod === 'totp' 
        ? '/accounts/2fa/totp/verify/' 
        : '/accounts/2fa/email/verify/';
      
      const response = await apiFetch<{
        verified: boolean;
        verification_token?: string;
        message?: string;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      
      if (response.verified) {
        // Generate backup codes (client-side for display)
        const codes = generateBackupCodes();
        setBackupCodes(codes);
        
        if (twoFactorMethod === 'totp') {
          setTotpEnabled(true);
        }
        setTwoFactorEnabled(true);
        setShowSetup2FA(false);
        setShowBackupCodes(true);
        setVerificationCode('');
        setOtpSent(false);
        toast.success('Two-factor authentication enabled');
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } catch (error: unknown) {
      logError('Failed to enable 2FA', error);
      toast.error((error instanceof Error ? error.message : 'Invalid code. Please try again.'));
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleDisable2FA = async (method: 'totp' | 'email_otp') => {
    try {
      if (method === 'totp') {
        await apiFetch('/accounts/2fa/totp/disable/', { method: 'POST' });
        setTotpEnabled(false);
        setTwoFactorSecret('');
        setTwoFactorQRCode('');
        toast.success('Authenticator app disabled');
      } else {
        // For email OTP, we just mark it as disabled on the backend
        // You may need to add a disable endpoint for email OTP
        setOtpEnabled(false);
        toast.success('Email OTP disabled');
      }
      
      // Update overall 2FA status
      if (!totpEnabled && !otpEnabled) {
        setTwoFactorEnabled(false);
        setBackupCodes([]);
      }
    } catch (error: unknown) {
      logError('Failed to disable 2FA', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleRegenerateBackupCodes = () => {
    const codes = generateBackupCodes();
    setBackupCodes(codes);
    toast.success('New backup codes generated');
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  const userInitials = currentUser
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U';

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className={appType.pageTitleList}>Settings</h1>
          <p className={cn(appType.pageSubtitle)}>
            Manage your account settings and preferences
          </p>
        </div>

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
            {/* =============================================================================
            // DELEGATION TAB - COMMENTED OUT FOR FUTURE USE
            // Uncomment to enable office delegation settings
            // Requires backend changes: uncomment delegation fields in Office model and run migrations
            // =============================================================================
            <TabsTrigger value="delegation">
              <Users className="h-4 w-4 mr-2" />
              Delegation
            </TabsTrigger>
            */}
          </TabsList>

          <ProfileSection
            profile={profile}
            profilePhoto={profilePhoto}
            profileErrors={profileErrors}
            isSavingProfile={isSavingProfile}
            isUploadingPhoto={isUploadingPhoto}
            userInitials={userInitials}
            systemRole={currentUser?.systemRole}
            gradeLevel={currentUser?.gradeLevel}
            division={currentUser?.division}
            department={currentUser?.department}
            onPhotoUpload={handlePhotoUpload}
            onSave={handleSaveProfile}
            onProfileChange={handleProfileChange}
          />

          <NotificationsSection
            notificationPrefs={notificationPrefs}
            isLoadingNotifications={isLoadingNotifications}
            isSavingNotifications={isSavingNotifications}
            onSave={handleSaveNotifications}
            onRetry={handleNotificationRetry}
            onPrefChange={handleNotificationPrefChange}
          />

          <AppearanceSection theme={theme} onThemeChange={setTheme} />

          <SecuritySection
            twoFactorEnabled={twoFactorEnabled}
            totpEnabled={totpEnabled}
            otpEnabled={otpEnabled}
            showSetup2FA={showSetup2FA}
            twoFactorMethod={twoFactorMethod}
            twoFactorSecret={twoFactorSecret}
            twoFactorQRCode={twoFactorQRCode}
            verificationCode={verificationCode}
            backupCodes={backupCodes}
            showBackupCodes={showBackupCodes}
            isEnabling2FA={isEnabling2FA}
            isLoading2FAStatus={isLoading2FAStatus}
            otpSent={otpSent}
            otpCountdown={otpCountdown}
            showPasswordDialog={showPasswordDialog}
            email={profile.email}
            onSetup2FA={handleSetup2FA}
            onSendEmailOTP={handleSendEmailOTP}
            onVerify2FA={handleVerify2FA}
            onDisable2FA={handleDisable2FA}
            onRegenerateBackupCodes={handleRegenerateBackupCodes}
            onCopyBackupCodes={copyBackupCodes}
            onVerificationCodeChange={setVerificationCode}
            onPasswordDialogChange={setShowPasswordDialog}
            onSetup2FADialogChange={handleSetup2FADialogChange}
            onBackupCodesDialogChange={handleBackupCodesDialogChange}
          />

          {/* Signature Tab - Now using the new SignatureSettingsCard with live seal preview */}
          <TabsContent value="signature" className="space-y-4">
            <SignatureSettingsCard />
          </TabsContent>

        </Tabs>
        
        {/* Dialogs */}
        
        <PasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />

        {/* 2FA Setup Dialog */}
        <Dialog open={showSetup2FA} onOpenChange={(open) => {
          setShowSetup2FA(open);
          if (!open) {
            setVerificationCode('');
            setOtpSent(false);
          }
        }}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {twoFactorMethod === 'totp' ? (
                  <>
                    <Smartphone className="h-5 w-5" />
                    Set Up Authenticator App
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Set Up Email Verification
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {twoFactorMethod === 'totp'
                  ? 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)'
                  : `We'll send a verification code to ${profile.email}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {twoFactorMethod === 'totp' ? (
                <>
                  {/* TOTP Setup - QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    {twoFactorQRCode ? (
                      <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(twoFactorQRCode)}`}
                        alt="2FA QR Code"
                        width={192}
                        height={192}
                      />
                    ) : (
                      <div className="w-48 h-48 bg-muted flex items-center justify-center rounded">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Can&apos;t scan? Enter this code manually:</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{twoFactorSecret}</code>
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(twoFactorSecret);
                        toast.success('Code copied');
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Enter verification code from your app:</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Email OTP Setup */}
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click the button below to receive a verification code at:
                        </p>
                        <p className="font-medium mt-1">{profile.email}</p>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={handleSendEmailOTP}
                        disabled={isEnabling2FA}
                      >
                        {isEnabling2FA ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Verification Code
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <Check className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Verification code sent to {profile.email}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Code expires in 5 minutes
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Enter the 6-digit code from your email:</Label>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="text-center text-2xl tracking-widest"
                        />
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={handleSendEmailOTP}
                        disabled={otpCountdown > 0 || isEnabling2FA}
                      >
                        {otpCountdown > 0 
                          ? `Resend code in ${otpCountdown}s`
                          : 'Resend Code'
                        }
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSetup2FA(false)}>Cancel</Button>
              {(twoFactorMethod === 'totp' || otpSent) && (
                <Button 
                  onClick={handleVerify2FA} 
                  disabled={verificationCode.length !== 6 || isEnabling2FA}
                >
                  {isEnabling2FA ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Codes Dialog */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Backup Codes
              </DialogTitle>
              <DialogDescription>
                Save these backup codes in a secure location. Each code can only be used once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Keep these codes safe. If you lose access to your authenticator app, you can use these codes to sign in.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyBackupCodes}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  const content = backupCodes.join('\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'npa-ecm-backup-codes.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <Button variant="outline" className="w-full" onClick={handleRegenerateBackupCodes}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Generate New Codes
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowBackupCodes(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
