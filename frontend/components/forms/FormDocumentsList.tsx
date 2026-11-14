'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileCheck, FileText, Users } from 'lucide-react';
import { ListRowCard } from '@/components/shared/ListRowCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import type { FormDocument } from '@/lib/api/dms-forms';
import { formatDateTime } from '@/lib/correspondence-helpers';
import { cn } from '@/lib/utils';
import {
  correspondenceQueueBadgeClass,
  correspondenceQueueDateClass,
  correspondenceQueueLeadingBoxClass,
  correspondenceQueueLeadingIconClass,
  correspondenceQueueListStackClass,
  correspondenceQueueMetaIconClass,
  correspondenceQueueMetaItemClass,
  correspondenceQueueMetaRowClass,
  correspondenceQueueSubjectClass,
  registryQueueEmptyIconClass,
} from '@/components/shared/registry-queue-styles';

type Tone = 'pending' | 'signed';

function FormSignatureRow({ form, tone }: { form: FormDocument; tone: Tone }) {
  const leadingClass = tone === 'pending' ? 'bg-amber-500/10' : 'bg-emerald-500/10';
  const iconClass =
    tone === 'pending'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';
  const badgeClass = tone === 'pending' ? 'bg-amber-500' : 'bg-emerald-600';
  const badge =
    tone === 'pending'
      ? 'Action required'
      : form.status === 'completed'
        ? 'Completed'
        : 'Signed by you';
  const meta =
    tone === 'pending'
      ? 'Awaiting your signature'
      : form.status === 'completed'
        ? 'Workflow complete'
        : 'Your signature recorded';
  const Icon = tone === 'pending' ? FileCheck : CheckCircle2;

  return (
    <ListRowCard
      density="compact"
      href={`/forms/${form.document.id}`}
      leading={
        <div className={cn(correspondenceQueueLeadingBoxClass, leadingClass)}>
          <Icon className={cn(correspondenceQueueLeadingIconClass, iconClass)} />
        </div>
      }
    >
      <h4 className={correspondenceQueueSubjectClass}>{form.document.title}</h4>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {form.template?.name || 'Form'}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Badge variant="default" className={cn(correspondenceQueueBadgeClass, badgeClass)}>
          {badge}
        </Badge>
        <span className={correspondenceQueueDateClass}>
          Updated {formatDateTime(form.updated_at)}
        </span>
      </div>
      <div className={cn(correspondenceQueueMetaRowClass, 'mt-1')}>
        <span className={correspondenceQueueMetaItemClass}>
          <FileText className={correspondenceQueueMetaIconClass} />
          <span className="truncate">Form ID: {form.id.slice(0, 8).toUpperCase()}</span>
        </span>
        <span className={correspondenceQueueMetaItemClass}>
          <Users className={correspondenceQueueMetaIconClass} />
          <span>{meta}</span>
        </span>
      </div>
    </ListRowCard>
  );
}

export function FormDocumentsList({
  forms,
  loading,
  tone,
}: {
  forms: FormDocument[];
  loading: boolean;
  tone: Tone;
}) {
  if (loading) {
    return (
      <LoadingState
        message={tone === 'pending' ? 'Loading pending signatures…' : 'Loading forms you signed…'}
      />
    );
  }

  if (forms.length === 0) {
    return tone === 'pending' ? (
      <EmptyState
        icon={<FileCheck className={registryQueueEmptyIconClass} />}
        title="All caught up"
        message="No documents require your signature."
        variant="dashed"
      />
    ) : (
      <EmptyState
        icon={<CheckCircle2 className={registryQueueEmptyIconClass} />}
        title="No signed forms yet"
        message="Forms you sign will appear here after you complete your signature step."
        variant="dashed"
      />
    );
  }

  return (
    <div className={correspondenceQueueListStackClass}>
      {forms.map((form) => (
        <FormSignatureRow key={form.id} form={form} tone={tone} />
      ))}
    </div>
  );
}
