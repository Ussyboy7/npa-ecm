"use client";

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Sun, Moon, Monitor } from 'lucide-react';
import { appType } from '@/lib/app-type';

interface AppearanceSectionProps {
  theme: string | undefined;
  onThemeChange: (theme: string) => void;
}

export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
  return (
    <TabsContent value="appearance" className="space-y-4">
      <div className="rounded-xl border border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className={appType.panelTitle}>Theme</h2>
          <p className={appType.caption}>
            Light and Dark apply to every page in NPA ECM. Choose System to follow your device.
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <Label>Color mode</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => onThemeChange('light')}
              >
                <Sun className="h-6 w-6" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => onThemeChange('dark')}
              >
                <Moon className="h-6 w-6" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => onThemeChange('system')}
              >
                <Monitor className="h-6 w-6" />
                System
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Document previews and the compose editor stay on white paper in both modes so memos remain print-accurate.
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
