"use client";

import { TabsContent } from '@/components/ui/tabs';
import { SignatureSettingsCard } from '@/components/settings/SignatureSettingsCard';

export function SignatureSection() {
  return (
    <TabsContent value="signature" className="space-y-4">
      <SignatureSettingsCard />
    </TabsContent>
  );
}
