"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgUsers } from "@/hooks/use-org-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api/dms";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { Send, Loader2 } from "lucide-react";
import type { DocumentRecord } from "@/lib/api/dms";
import { PrimaryRoutePanel } from "@/components/correspondence/PrimaryRoutePanel";
import { getDivisionById } from "@/lib/npa-structure";
import { submitParallelRoute, submitCcDistribution } from "@/lib/parallel-routing";

interface CorrespondenceRoutingViewProps {
  document: DocumentRecord;
  onComplete?: () => void;
}

export function CorrespondenceRoutingView({
  document,
  onComplete,
}: CorrespondenceRoutingViewProps) {
  const { directorates, divisions, offices, officeMemberships } = useOrganization();
  const { users } = useOrgUsers();
  const { currentUser } = useCurrentUser();

  const [routeType, setRouteType] = useState<'person' | 'office'>('person');
  const [routeMode, setRouteMode] = useState<'single' | 'parallel'>('single');
  const [forwardTo, setForwardTo] = useState<string>('');
  const [targetOfficeId, setTargetOfficeId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState<string>('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState<string>('all');
  const [purpose, setPurpose] = useState<'action' | 'information' | 'approval'>('action');
  const [mergeStrategy, setMergeStrategy] = useState<'all' | 'any' | 'majority' | 'independent'>('all');
  const [parallelUserIds, setParallelUserIds] = useState<string[]>([]);
  const [parallelOfficeIds, setParallelOfficeIds] = useState<string[]>([]);
  const [branchConfigs, setBranchConfigs] = useState<Record<string, { purpose: 'action' | 'information' | 'approval'; minuteText: string }>>({});
  const [distributionUserIds, setDistributionUserIds] = useState<string[]>([]);
  const [distributionOfficeIds, setDistributionOfficeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [subject, setSubject] = useState<string>(document.title || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeUsers = useMemo(
    () => users.filter((u) => u.active !== false && u.id !== currentUser?.id),
    [users, currentUser]
  );

  const officeOptionsForRouting = useMemo(
    () =>
      offices
        .filter((o) => o.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((o) => ({
          id: o.id,
          name: o.name,
          officeType: o.officeType ?? '',
          directorateId: o.directorateId ?? undefined,
          divisionId: o.divisionId ?? undefined,
        })),
    [offices]
  );

  const findUserById = useCallback(
    (id: string) => activeUsers.find((u) => u.id === id),
    [activeUsers]
  );

  const getUserOfficeInfo = useCallback(
    (userId: string): { office?: { name: string }; division?: { name: string } } | null => {
      const membership = officeMemberships.find(
        (m) => m.userId === userId && m.isPrimary && m.isActive
      );
      if (!membership) return null;
      const office = offices.find((o) => o.id === membership.officeId);
      const user = findUserById(userId);
      const division = user?.division ? getDivisionById(user.division) : null;
      return {
        office: office ? { name: office.name } : undefined,
        division: division ? { name: division.name } : undefined,
      };
    },
    [officeMemberships, offices, findUserById]
  );

  const parallelTargetCount = parallelUserIds.length + parallelOfficeIds.length;
  const canSubmit =
    routeMode === 'single'
      ? routeType === 'person'
        ? Boolean(forwardTo)
        : Boolean(targetOfficeId)
      : parallelTargetCount >= 2;

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('User not found');
      return;
    }

    if (routeMode === 'single' && routeType === 'office' && !targetOfficeId) {
      toast.error('Please select an office');
      return;
    }
    if (routeMode === 'single' && routeType === 'person' && !forwardTo) {
      toast.error('Please select a person');
      return;
    }
    if (routeMode === 'parallel' && parallelTargetCount < 2) {
      toast.error('Parallel routing requires at least two people or offices');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim() || document.title || 'Document');
      formData.append('sender_name', currentUser.name || 'System');
      formData.append('sender_organization', 'Internal');
      formData.append('received_date', new Date().toISOString().split('T')[0]);
      formData.append('priority', priority);
      formData.append('source', 'internal');
      formData.append('direction', 'upward');
      formData.append('document_type', 'letter');
      
      if (routeMode === 'single' && routeType === 'office') {
        const office = offices.find((o) => o.id === targetOfficeId);
        if (office) {
          const primaryMember = officeMemberships.find(
            (m) => m.officeId === office.id && m.isPrimary && m.isActive
          );
          if (primaryMember) {
            formData.append('current_approver_id', primaryMember.userId);
          }
          formData.append('current_office', targetOfficeId);
        }
      } else if (routeMode === 'single') {
        formData.append('current_approver_id', forwardTo);
      }

      const correspondenceResponse = await apiFetch<{ id: string; reference_number?: string }>(
        '/correspondence/items/',
        {
          method: 'POST',
          body: formData,
        }
      );

      await apiFetch(`/correspondence/document-links/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correspondence: correspondenceResponse.id,
          document: document.id,
          notes: notes.trim() || undefined,
        }),
      });

      if (routeMode === 'parallel') {
        await submitParallelRoute(apiFetch, {
          correspondenceId: correspondenceResponse.id,
          parallelUserIds,
          parallelOfficeIds,
          branchConfigs,
          mergeStrategy,
          defaultPurpose: purpose,
          defaultMinuteText: notes.trim() || 'Please review and respond.',
        });
      }

      if (routeMode === 'single' && (notes.trim() || purpose !== 'information')) {
        await apiFetch('/correspondence/minutes/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            correspondence: correspondenceResponse.id,
            user_id: currentUser.id,
            action_type: 'minute',
            minute_text: notes.trim() || 'Routed via document correspondence',
            direction: 'upward',
            step_number: 1,
            purpose,
            requires_response: purpose !== 'information',
          }),
        });
      }

      await submitCcDistribution(
        apiFetch,
        correspondenceResponse.id,
        distributionUserIds,
        distributionOfficeIds,
        currentUser?.id,
      );

      toast.success('Document sent via correspondence', {
        description: `Reference: ${correspondenceResponse.reference_number || correspondenceResponse.id}`,
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
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="corr-subject">Subject</Label>
          <Input
            id="corr-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Correspondence subject"
          />
        </div>

        <PrimaryRoutePanel
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          routeType={routeType}
          onRouteTypeChange={(v) => {
            setRouteType(v);
            if (v === 'office') {
              setForwardTo('');
              setPersonSearchQuery('');
            } else {
              setTargetOfficeId('');
              setOfficeSearchQuery('');
              setOfficeFilterDirectorate('all');
              setOfficeFilterDivision('all');
            }
          }}
          forwardTo={forwardTo}
          onForwardToChange={setForwardTo}
          personSearchQuery={personSearchQuery}
          onPersonSearchQueryChange={setPersonSearchQuery}
          targetOfficeId={targetOfficeId}
          onTargetOfficeIdChange={(v) => {
            setTargetOfficeId(v);
            setForwardTo('');
          }}
          officeSearchQuery={officeSearchQuery}
          onOfficeSearchQueryChange={setOfficeSearchQuery}
          officeFilterDirectorate={officeFilterDirectorate}
          onOfficeFilterDirectorateChange={(v) => {
            setOfficeFilterDirectorate(v);
            setOfficeFilterDivision('all');
          }}
          officeFilterDivision={officeFilterDivision}
          onOfficeFilterDivisionChange={setOfficeFilterDivision}
          purpose={purpose}
          onPurposeChange={setPurpose}
          parallelUserIds={parallelUserIds}
          onParallelUserIdsChange={setParallelUserIds}
          parallelOfficeIds={parallelOfficeIds}
          onParallelOfficeIdsChange={setParallelOfficeIds}
          mergeStrategy={mergeStrategy}
          onMergeStrategyChange={setMergeStrategy}
          branchConfigs={branchConfigs}
          onBranchConfigsChange={setBranchConfigs}
          defaultBranchText={notes.trim() || 'Please review and respond.'}
          distributionUserIds={distributionUserIds}
          onDistributionUserIdsChange={setDistributionUserIds}
          distributionOfficeIds={distributionOfficeIds}
          onDistributionOfficeIdsChange={setDistributionOfficeIds}
          offices={officeOptionsForRouting}
          directorates={directorates}
          divisions={divisions}
          users={activeUsers}
          assistantList={[]}
          approverList={activeUsers}
          findUserById={findUserById}
          getUserOfficeInfo={getUserOfficeInfo}
        />

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label htmlFor="corr-notes">Notes</Label>
          <Textarea
            id="corr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes or instructions..."
            rows={3}
          />
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send via Correspondence
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
