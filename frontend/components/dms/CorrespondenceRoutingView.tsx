"use client";

import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api/dms";
import {
  findOfficeSeatHolder,
  listOfficeMembershipsForOffice,
} from "@/lib/office-memberships-client";
import { logError } from "@/lib/client-logger";
import { formatDateForAPI } from "@/lib/datetime";
import { toast } from "@/components/ui/sonner";
import { Search, CheckCircle2, ChevronDown } from "lucide-react";
import type { DocumentRecord } from "@/lib/api/dms";

const PURPOSES = [
  { value: 'action', label: 'For action' },
  { value: 'information', label: 'For information' },
  { value: 'approval', label: 'For approval' },
] as const;

type CorrespondencePurpose = (typeof PURPOSES)[number]['value'];

export interface CorrespondenceRoutingState {
  canSubmit: boolean;
  isSubmitting: boolean;
  summary: string;
}

export interface CorrespondenceRoutingHandle {
  submit: () => void;
}

interface CorrespondenceRoutingViewProps {
  document: DocumentRecord;
  onComplete?: () => void;
  onStateChange?: (state: CorrespondenceRoutingState) => void;
}

/**
 * Route a document through the correspondence registry: correspondence is the
 * official channel, so a send is addressed to an office, never to a person.
 *
 * The office addressed is the audience. The record arrives assigned to that
 * office's seat (principal, acting head, secretariat) and the registry re-derives
 * the holder from the office when the dispatch minute is recorded. The receiving
 * office can open the document while the record is in its custody — custody
 * derived from the minute trail, so this dialog writes no permission row and
 * sends no share notification.
 */
export const CorrespondenceRoutingView = forwardRef<
  CorrespondenceRoutingHandle,
  CorrespondenceRoutingViewProps
>(function CorrespondenceRoutingView({ document, onComplete, onStateChange }, ref) {
  const { directorates, divisions, offices } = useOrganization();
  const { currentUser } = useCurrentUser();

  const [subject, setSubject] = useState<string>(document.title || '');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [purpose, setPurpose] = useState<CorrespondencePurpose>('action');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const officeOptions = useMemo(
    () =>
      offices
        .filter((office) => office.isActive)
        .map((office) => ({
          ...office,
          directorateName: directorates.find((d) => d.id === office.directorateId)?.name,
          divisionName: divisions.find((d) => d.id === office.divisionId)?.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [offices, directorates, divisions],
  );

  const filteredOffices = useMemo(() => {
    const query = officeSearchQuery.trim().toLowerCase();
    if (!query) return officeOptions;
    return officeOptions.filter((office) =>
      [office.name, office.code, office.officeType, office.directorateName, office.divisionName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [officeOptions, officeSearchQuery]);

  const targetOffice = officeOptions.find((office) => office.id === targetOfficeId);
  const purposeLabel = PURPOSES.find((option) => option.value === purpose)?.label ?? '';
  const canSubmit = Boolean(targetOfficeId);

  const summary = targetOffice ? `${targetOffice.name} · ${purposeLabel}` : 'Choose a receiving office';

  useEffect(() => {
    onStateChange?.({ canSubmit, isSubmitting, summary });
  }, [canSubmit, isSubmitting, summary, onStateChange]);

  const handleSubmit = useCallback(async () => {
    if (!currentUser) {
      toast.error('User not found');
      return;
    }
    if (!targetOfficeId) {
      toast.error('Please select the office to route this to');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim() || document.title || 'Document');
      formData.append('sender_name', currentUser.name || 'System');
      formData.append('sender_organization', 'Internal');
      formData.append('received_date', formatDateForAPI(new Date()));
      formData.append('priority', priority);
      formData.append('source', 'internal');
      formData.append('direction', 'upward');
      formData.append('document_type', 'letter');
      formData.append('current_office', targetOfficeId);

      // The office's seat — principal, acting head or secretariat — is the
      // accountable recipient: it arrives assigned, and the registry re-derives
      // the holder from the office when the dispatch minute is recorded.
      const targetOfficeMemberships = await listOfficeMembershipsForOffice(targetOfficeId)
        .catch((error: unknown) => {
          logError('Failed to load target office memberships', error);
          return [];
        });
      const seatHolder = findOfficeSeatHolder(targetOfficeMemberships);
      if (!seatHolder) {
        toast.error('Office has no holder', {
          description:
            'This office has no principal, acting head or secretariat, so there is nobody to receive the memo.',
        });
        return;
      }
      formData.append('current_approver_id', seatHolder.userId);

      const correspondenceResponse = await apiFetch<{ id: string; reference_number?: string }>(
        '/correspondence/items/',
        { method: 'POST', body: formData },
      );

      await apiFetch(`/correspondence/document-links/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correspondence: correspondenceResponse.id,
          document: document.id,
          notes: notes.trim() || undefined,
        }),
      });

      await apiFetch('/correspondence/minutes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correspondence: correspondenceResponse.id,
          user_id: currentUser.id,
          action_type: 'minute',
          minute_text: notes.trim() || 'Routed via document correspondence',
          direction: 'upward',
          step_number: 1,
          purpose,
          requires_response: purpose !== 'information',
          // The dispatch step names the receiving office. The registry, not this
          // dialog, decides which seat holder holds it.
          to_office_id: targetOfficeId,
        }),
      });

      toast.success('Document sent via correspondence', {
        description: `${targetOffice?.name ?? 'Office'} · reference ${
          correspondenceResponse.reference_number || correspondenceResponse.id
        }`,
        action: {
          label: 'View',
          onClick: () => {
            window.open(`/correspondence/${correspondenceResponse.id}`, '_blank');
          },
        },
      });

      onComplete?.();
    } catch (error: unknown) {
      logError('Failed to create correspondence', error);
      toast.error('Failed to send document via correspondence');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentUser,
    targetOfficeId,
    subject,
    document.title,
    document.id,
    priority,
    notes,
    purpose,
    targetOffice?.name,
    onComplete,
  ]);

  useImperativeHandle(ref, () => ({ submit: () => void handleSubmit() }), [handleSubmit]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="corr-subject" className="text-xs text-muted-foreground">
          Subject
        </Label>
        <Input
          id="corr-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Correspondence subject"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">Route to office *</Label>
          <span className="text-[11px] text-muted-foreground">Does not grant access</span>
        </div>
        {officeOptions.length > 8 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={officeSearchQuery}
              onChange={(event) => setOfficeSearchQuery(event.target.value)}
              placeholder="Search office, directorate or division..."
              className="pl-9 h-9"
            />
          </div>
        )}
        <ScrollArea className="h-[min(190px,23vh)] rounded-md border p-2">
          <div className="space-y-1.5">
            {filteredOffices.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No matching offices found.</p>
            ) : (
              filteredOffices.map((office) => {
                const selected = office.id === targetOfficeId;
                return (
                  <div
                    key={office.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    className={`w-full text-left flex items-start gap-2 p-2 rounded border ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                    onClick={() => setTargetOfficeId(office.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setTargetOfficeId(office.id);
                      }
                    }}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background'
                      }`}
                      aria-hidden="true"
                    >
                      {selected ? <CheckCircle2 className="h-3 w-3" /> : null}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{office.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[office.directorateName, office.divisionName].filter(Boolean).join(' · ') ||
                          office.officeType}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Purpose</Label>
        <Select value={purpose} onValueChange={(value) => setPurpose(value as CorrespondencePurpose)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PURPOSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Collapsible className="group">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
            More options
            <ChevronDown className="ml-1 h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <Label htmlFor="corr-notes" className="text-xs text-muted-foreground">
          Instructions
        </Label>
        <Textarea
          id="corr-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Minute to the receiving office..."
          rows={2}
          className="min-h-[60px] resize-none text-sm"
        />
      </div>

    </div>
  );
});
