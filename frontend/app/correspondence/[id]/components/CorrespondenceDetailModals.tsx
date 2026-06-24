"use client";

import { logWarn } from '@/lib/client-logger';
import { apiFetch } from '@/lib/api-client';
import { bumpSidebarCounts } from '@/hooks/use-sidebar-counts';
import { MinuteModal } from '@/components/correspondence/MinuteModal';
import { EditMinuteModal } from '@/components/correspondence/EditMinuteModal';
import { AdditionalMinuteModal } from '@/components/correspondence/AdditionalMinuteModal';
import { RecallMinuteModal } from '@/components/correspondence/RecallMinuteModal';
import { TreatmentModal } from '@/components/correspondence/TreatmentModal';
import { MinuteDetailModal } from '@/components/correspondence/MinuteDetailModal';
import { CompletionSummaryModal } from '@/components/correspondence/CompletionSummaryModal';
import { DelegateModal } from '@/components/correspondence/DelegateModal';
import { PrintPreviewModal } from '@/components/correspondence/PrintPreviewModal';
import { DocumentPreviewModal } from '@/components/correspondence/DocumentPreviewModal';
import { LinkDocumentDialog } from '@/components/correspondence/LinkDocumentDialog';
import { LinkCaseDialog } from '@/components/correspondence/LinkCaseDialog';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';
import type { Correspondence, Minute, User } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/dms-storage';
import type { ModalType } from '@/hooks/use-modal-state';

interface CorrespondenceDetailModalsProps {
  correspondence: Correspondence;
  minutes: Minute[];
  activeUser: User;
  selectedMinute: Minute | null;
  linkedDocuments: DocumentRecord[];
  isOpen: (modal: ModalType) => boolean;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  onMinuteClose: () => void;
  onTreatmentClose: () => void;
  onCompletionClose: () => void;
  onDelegate: (
    assistantId: string,
    assistantType: 'TA' | 'PA',
    notes: string,
    duration?: string,
    expiresAt?: string,
  ) => Promise<void>;
  onLinkDocumentsSave: (documentIds: string[]) => Promise<void>;
  onSetSelectedMinute: (minute: Minute | null) => void;
  onSetSelectedAttachmentIndex: (index: number | null) => void;
  onSetRemoteCorrespondence: (corr: Correspondence | null) => void;
  refreshData: () => void;
  refreshMinutes: () => Promise<void>;
  syncFromApi: () => Promise<unknown>;
  lookupUser: (userId?: string) => User | undefined;
  defaultPreviewAttachmentUrl: string | null | undefined;
  defaultPreviewAttachmentFileName: string | undefined;
  defaultPreviewAttachmentSource: 'attachment' | 'completion-package';
}

export function CorrespondenceDetailModals({
  correspondence,
  minutes,
  activeUser,
  selectedMinute,
  linkedDocuments,
  isOpen,
  openModal,
  closeModal,
  onMinuteClose,
  onTreatmentClose,
  onCompletionClose,
  onDelegate,
  onLinkDocumentsSave,
  onSetSelectedMinute,
  onSetSelectedAttachmentIndex,
  onSetRemoteCorrespondence,
  refreshData,
  refreshMinutes,
  syncFromApi,
  lookupUser,
  defaultPreviewAttachmentUrl,
  defaultPreviewAttachmentFileName,
  defaultPreviewAttachmentSource,
}: CorrespondenceDetailModalsProps) {
  const documentContentHtml =
    linkedDocuments[0]?.versions?.[linkedDocuments[0].versions.length - 1]?.contentHtml;

  return (
    <>
      {isOpen('minute') && (
        <MinuteModal
          correspondence={correspondence}
          isOpen
          onClose={onMinuteClose}
          direction={correspondence.direction}
        />
      )}

      {isOpen('treatment') && (
        <TreatmentModal correspondence={correspondence} isOpen onClose={onTreatmentClose} />
      )}

      {selectedMinute && (
        <>
          <MinuteDetailModal
            minute={selectedMinute}
            open={isOpen('minute-detail')}
            onOpenChange={(open) => (open ? openModal('minute-detail') : closeModal())}
            authorName={lookupUser(selectedMinute.userId)?.name ?? selectedMinute.userName}
            showDelegationInfo={String(selectedMinute.userId) === String(activeUser.id)}
          />
          <EditMinuteModal
            minute={selectedMinute}
            isOpen={isOpen('edit-minute')}
            onClose={() => {
              closeModal();
              onSetSelectedMinute(null);
            }}
            onSuccess={() => {
              onSetSelectedMinute(null);
              bumpSidebarCounts();
              refreshData();
              void refreshMinutes();
            }}
          />
          <RecallMinuteModal
            minute={selectedMinute}
            isOpen={isOpen('recall-minute')}
            onClose={() => {
              closeModal();
              onSetSelectedMinute(null);
            }}
            onSuccess={async () => {
              onSetSelectedMinute(null);
              bumpSidebarCounts();
              await syncFromApi();
              refreshData();
              await refreshMinutes();
              if (correspondence?.id) {
                try {
                  const updated = await apiFetch<Record<string, unknown>>(
                    `/correspondence/items/${correspondence.id}/`,
                  );
                  if (updated) {
                    onSetRemoteCorrespondence(mapApiCorrespondence(updated));
                  }
                } catch (error: unknown) {
                  logWarn('Failed to refresh correspondence after recall', error);
                }
              }
            }}
          />
          <AdditionalMinuteModal
            correspondence={correspondence}
            isOpen={isOpen('additional-minute')}
            onClose={() => {
              closeModal();
              onSetSelectedMinute(null);
            }}
            onSuccess={() => {
              onSetSelectedMinute(null);
              bumpSidebarCounts();
              refreshData();
              void syncFromApi();
              void refreshMinutes();
            }}
            preSelectedMinuteId={selectedMinute?.id}
          />
        </>
      )}

      {isOpen('completion') && (
        <CompletionSummaryModal
          open
          onOpenChange={(open: boolean) => {
            if (open) {
              openModal('completion');
            } else {
              onCompletionClose();
            }
          }}
          correspondence={correspondence}
          minutes={minutes}
          documentContentHtml={documentContentHtml}
        />
      )}

      {isOpen('document-preview') && (
        <DocumentPreviewModal
          correspondence={correspondence}
          minutes={minutes}
          isOpen
          onClose={() => {
            closeModal();
            onSetSelectedAttachmentIndex(null);
          }}
          documentContentHtml={documentContentHtml}
          attachmentUrl={defaultPreviewAttachmentUrl ?? undefined}
          attachmentFileName={defaultPreviewAttachmentFileName}
          attachmentSource={defaultPreviewAttachmentSource}
        />
      )}

      {isOpen('print-preview') && (
        <PrintPreviewModal
          correspondence={correspondence}
          minutes={minutes}
          isOpen
          onClose={() => closeModal()}
          documentContentHtml={documentContentHtml}
          attachmentUrl={defaultPreviewAttachmentUrl ?? undefined}
          attachmentFileName={defaultPreviewAttachmentFileName}
        />
      )}

      {isOpen('delegate') && (
        <DelegateModal
          open
          onOpenChange={(open) => (open ? openModal('delegate') : closeModal())}
          correspondenceId={correspondence.id}
          executiveId={activeUser.id}
          onDelegate={onDelegate}
        />
      )}

      {isOpen('link-document') && (
        <LinkDocumentDialog
          open
          onOpenChange={(open) => (open ? openModal('link-document') : closeModal())}
          linkedDocumentIds={correspondence.linkedDocumentIds}
          onSave={onLinkDocumentsSave}
          divisionId={correspondence.divisionId}
          departmentId={correspondence.departmentId}
          subject={correspondence.subject}
        />
      )}

      {isOpen('link-case') && (
        <LinkCaseDialog
          open
          onOpenChange={(open) => (open ? openModal('link-case') : closeModal())}
          correspondenceId={correspondence.id}
          onLinked={async () => {
            bumpSidebarCounts();
            await refreshData();
            await syncFromApi();
          }}
        />
      )}
    </>
  );
}
