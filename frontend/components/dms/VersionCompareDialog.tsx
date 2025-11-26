"use client";

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type DocumentVersion } from '@/lib/dms-storage';
import { Diff, computeLineDiff } from '@/lib/diff-utils';

interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: DocumentVersion[];
  baseVersion?: DocumentVersion | null;
}

export const VersionCompareDialog = ({ open, onOpenChange, versions, baseVersion }: VersionCompareDialogProps) => {
  const [selectedBaseline, setSelectedBaseline] = useState<string | undefined>(baseVersion?.id ?? versions[0]?.id);
  const [selectedTarget, setSelectedTarget] = useState<string | undefined>(versions[1]?.id ?? baseVersion?.id);

  const baselineVersion = useMemo(() => versions.find((version) => version.id === selectedBaseline) ?? baseVersion ?? versions[0], [versions, selectedBaseline, baseVersion]);
  const targetVersion = useMemo(() => {
    if (!selectedTarget) return versions[0];
    return versions.find((version) => version.id === selectedTarget) ?? versions[0];
  }, [versions, selectedTarget]);

  const diff: Diff[] = useMemo(() => {
    const baselineText = baselineVersion?.contentHtml ?? '';
    const targetText = targetVersion?.contentHtml ?? '';
    return computeLineDiff(baselineText, targetText);
  }, [baselineVersion, targetVersion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
          <DialogDescription>Select two versions to review changes line by line.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Baseline Version</label>
            <Select value={baselineVersion?.id} onValueChange={setSelectedBaseline}>
              <SelectTrigger>
                <SelectValue placeholder="Select baseline" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    v{version.versionNumber} · {new Date(version.uploadedAt).toLocaleString('en-US')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Target Version</label>
            <Select value={targetVersion?.id} onValueChange={setSelectedTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    v{version.versionNumber} · {new Date(version.uploadedAt).toLocaleString('en-US')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Side-by-side comparison view */}
        <div className="grid grid-cols-2 gap-4 border border-border rounded-md overflow-hidden">
          <div className="border-r border-border">
            <div className="bg-muted/50 px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground">
                Version {baselineVersion?.versionNumber} (Baseline)
              </p>
              <p className="text-[10px] text-muted-foreground">
                {baselineVersion?.uploadedAt ? new Date(baselineVersion.uploadedAt).toLocaleString('en-US') : 'Unknown date'}
              </p>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {baselineVersion?.contentText || baselineVersion?.contentHtml?.replace(/<[^>]+>/g, '') || 'No content'}
              </div>
            </ScrollArea>
          </div>
          <div>
            <div className="bg-muted/50 px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground">
                Version {targetVersion?.versionNumber} (Target)
              </p>
              <p className="text-[10px] text-muted-foreground">
                {targetVersion?.uploadedAt ? new Date(targetVersion.uploadedAt).toLocaleString('en-US') : 'Unknown date'}
              </p>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono space-y-1">
                {diff.map((entry, index) => {
                  const color = entry.type === 'added' 
                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30' 
                    : entry.type === 'removed' 
                      ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 line-through' 
                      : 'text-foreground';
                  return (
                    <div key={`${entry.type}-${index}`} className={`${color} px-1 rounded-sm`}>
                      {entry.value}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
