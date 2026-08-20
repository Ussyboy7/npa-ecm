"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Sun, Moon, Monitor } from 'lucide-react';

interface AppearanceSectionProps {
  theme: string | undefined;
  onThemeChange: (theme: string) => void;
}

export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
  return (
    <TabsContent value="appearance" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Light and Dark apply to every page in NPA ECM. Choose System to follow your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </TabsContent>
  );
}
