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

        <ScrollArea className="max-h-[420px] border border-border rounded-md">
          <div className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono space-y-1">
            {diff.map((entry, index) => {
              const color = entry.type === 'added' ? 'text-success-foreground bg-success/10' : entry.type === 'removed' ? 'text-destructive-foreground bg-destructive/10' : 'text-muted-foreground';
              const symbol = entry.type === 'added' ? '+ ' : entry.type === 'removed' ? '- ' : '  ';
              return (
                <div key={`${entry.type}-${index}`} className={`${color} px-1 rounded-sm`}>{`${symbol}${entry.value}`}</div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
