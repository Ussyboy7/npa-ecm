"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import {
  AlertCircle,
  RefreshCcw,
  Volume2,
  Clock,
  Loader2,
  Save,
} from 'lucide-react';
import { type NotificationPreferences as NotificationPreferencesType } from '@/lib/notifications-storage';

interface NotificationsSectionProps {
  notificationPrefs: NotificationPreferencesType | null;
  isLoadingNotifications: boolean;
  isSavingNotifications: boolean;
  onSave: () => void;
  onRetry: () => void;
  onPrefChange: (field: string, value: boolean | string | number) => void;
}

export function NotificationsSection({
  notificationPrefs,
  isLoadingNotifications,
  isSavingNotifications,
  onSave,
  onRetry,
  onPrefChange,
}: NotificationsSectionProps) {
  return (
    <TabsContent value="notifications" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about correspondence, approvals, and system updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading preferences...</span>
            </div>
          ) : !notificationPrefs ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Unable to load notification preferences.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">In-App Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications within the application</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.inAppEnabled ?? true}
                      onCheckedChange={(checked) => onPrefChange('inAppEnabled', checked)}
                    />
                  </div>
                  {notificationPrefs.inAppEnabled && (
                    <>
                      <div className="flex items-center justify-between pl-6">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Urgent Only</Label>
                          <p className="text-xs text-muted-foreground">Only show urgent priority notifications</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.inAppUrgentOnly ?? false}
                          onCheckedChange={(checked) => onPrefChange('inAppUrgentOnly', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <div className="space-y-0.5">
                          <Label className="text-sm flex items-center gap-2">
                            <Volume2 className="h-4 w-4" /> Sound
                          </Label>
                          <p className="text-xs text-muted-foreground">Play sound for new notifications</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.soundEnabled ?? true}
                          onCheckedChange={(checked) => onPrefChange('soundEnabled', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.emailEnabled ?? true}
                      onCheckedChange={(checked) => onPrefChange('emailEnabled', checked)}
                    />
                  </div>
                  {notificationPrefs.emailEnabled && (
                    <>
                      <div className="flex items-center justify-between pl-6">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Urgent Only</Label>
                          <p className="text-xs text-muted-foreground">Only send emails for urgent priority</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.emailUrgentOnly ?? false}
                          onCheckedChange={(checked) => onPrefChange('emailUrgentOnly', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Daily Digest</Label>
                          <p className="text-xs text-muted-foreground">Receive a daily summary instead of individual emails</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.emailDigest ?? false}
                          onCheckedChange={(checked) => onPrefChange('emailDigest', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Quiet Hours
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Quiet Hours</Label>
                      <p className="text-sm text-muted-foreground">Pause non-urgent notifications during set hours</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.quietHoursEnabled ?? false}
                      onCheckedChange={(checked) => onPrefChange('quietHoursEnabled', checked)}
                    />
                  </div>
                  {notificationPrefs.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label className="text-sm">Start Time</Label>
                        <Input
                          type="time"
                          value={notificationPrefs.quietHoursStart || '22:00'}
                          onChange={(e) => onPrefChange('quietHoursStart', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End Time</Label>
                        <Input
                          type="time"
                          value={notificationPrefs.quietHoursEnd || '07:00'}
                          onChange={(e) => onPrefChange('quietHoursEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Priority Filters</h3>
                <p className="text-xs text-muted-foreground">Choose which priority levels trigger notifications</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                      <span className="text-sm">Urgent</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.priorityUrgent ?? true}
                      onCheckedChange={(checked) => onPrefChange('priorityUrgent', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="h-2 w-2 p-0 rounded-full bg-orange-500" />
                      <span className="text-sm">High</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.priorityHigh ?? true}
                      onCheckedChange={(checked) => onPrefChange('priorityHigh', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="h-2 w-2 p-0 rounded-full bg-yellow-500" />
                      <span className="text-sm">Normal</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.priorityNormal ?? true}
                      onCheckedChange={(checked) => onPrefChange('priorityNormal', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="h-2 w-2 p-0 rounded-full bg-green-500" />
                      <span className="text-sm">Low</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.priorityLow ?? true}
                      onCheckedChange={(checked) => onPrefChange('priorityLow', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Module Filters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Correspondence</Label>
                    <Switch
                      checked={notificationPrefs.moduleCorrespondence ?? true}
                      onCheckedChange={(checked) => onPrefChange('moduleCorrespondence', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Document Management</Label>
                    <Switch
                      checked={notificationPrefs.moduleDms ?? true}
                      onCheckedChange={(checked) => onPrefChange('moduleDms', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Workflow</Label>
                    <Switch
                      checked={notificationPrefs.moduleWorkflow ?? true}
                      onCheckedChange={(checked) => onPrefChange('moduleWorkflow', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">System</Label>
                    <Switch
                      checked={notificationPrefs.moduleSystem ?? true}
                      onCheckedChange={(checked) => onPrefChange('moduleSystem', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Auto-Archive Notifications</h3>
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-normal">Archive read notifications after</Label>
                  <Select
                    value={String(notificationPrefs.autoArchiveDays ?? 30)}
                    onValueChange={(value) => onPrefChange('autoArchiveDays', parseInt(value))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <Button onClick={onSave} disabled={isSavingNotifications}>
                {isSavingNotifications ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
