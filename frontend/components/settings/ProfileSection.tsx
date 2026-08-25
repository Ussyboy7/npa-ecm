"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { Loader2, Camera, Save, Briefcase, Building2 } from 'lucide-react';
import { appType } from '@/lib/app-type';

interface ProfileSectionProps {
  profile: { firstName: string; lastName: string; email: string; phone: string; bio: string; jobTitle: string };
  profilePhoto: string | null;
  profileErrors: Record<string, string>;
  isSavingProfile: boolean;
  isUploadingPhoto: boolean;
  userInitials: string;
  systemRole?: string;
  gradeLevel?: string;
  division?: string;
  department?: string;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onProfileChange: (field: string, value: string) => void;
}

export function ProfileSection({
  profile,
  profilePhoto,
  profileErrors,
  isSavingProfile,
  isUploadingPhoto,
  userInitials,
  systemRole,
  gradeLevel,
  division,
  department,
  onPhotoUpload,
  onSave,
  onProfileChange,
}: ProfileSectionProps) {
  return (
    <TabsContent value="profile" className="space-y-4">
      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={appType.panelTitle}>Profile Information</h2>
          <p className={appType.caption}>
            Update your personal information and profile photo.
          </p>
        </div>
        <div className="space-y-6 p-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhoto || undefined} alt="Profile photo" />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPhotoUpload}
                disabled={isUploadingPhoto}
              />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{profile.firstName} {profile.lastName}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{profile.jobTitle || systemRole || 'No title set'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>{division || department || 'No department'}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={profile.firstName}
                onChange={(e) => onProfileChange('firstName', e.target.value)}
              />
              {profileErrors.firstName && (
                <p className="text-sm text-destructive">{profileErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={profile.lastName}
                onChange={(e) => onProfileChange('lastName', e.target.value)}
              />
              {profileErrors.lastName && (
                <p className="text-sm text-destructive">{profileErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={profile.email}
              onChange={(e) => onProfileChange('email', e.target.value)}
            />
            {profileErrors.email && (
              <p className="text-sm text-destructive">{profileErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={profile.phone}
              onChange={(e) => onProfileChange('phone', e.target.value)}
            />
            {profileErrors.phone && (
              <p className="text-sm text-destructive">{profileErrors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio <span className="text-muted-foreground text-xs">(Optional)</span></Label>
            <Textarea
              id="bio"
              placeholder="Tell us a bit about yourself..."
              value={profile.bio}
              onChange={(e) => onProfileChange('bio', e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{profile.bio.length}/500 characters</p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="text-sm font-medium">Organization Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Job Title</p>
                <p className="font-medium">{systemRole || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grade Level</p>
                <p className="font-medium">{gradeLevel || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Division</p>
                <p className="font-medium">{division || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Department</p>
                <p className="font-medium">{department || 'Not assigned'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Contact your administrator to update organization details.</p>
          </div>

          <Button size="sm" onClick={onSave} disabled={isSavingProfile}>
            {isSavingProfile ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
