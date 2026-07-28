import { Correspondence, Minute, MinuteSignaturePayload } from '@/lib/npa-structure';
import type { ApiCorrespondence, ApiMinute } from '@/lib/api/correspondence';
import type { Delegation } from '@/lib/api/delegations';
import { isRecord, asString } from '@/lib/type-utils';

const asStringOptional = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return String(value);
};

const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

const asNumberOptional = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const asOneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};

const asOneOfOptional = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  if (typeof value !== 'string') return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
};

const normalizeId = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    return normalizeId((value as Record<string, unknown>).id);
  }
  return String(value);
};

export const mapApiCorrespondence = (item: ApiCorrespondence): Correspondence => {
  const currentApprover = isRecord(item.current_approver) ? item.current_approver : undefined;
  const createdBy = isRecord(item.created_by) ? item.created_by : undefined;
  const division = isRecord(item.division) ? item.division : undefined;
  const department = isRecord(item.department) ? item.department : undefined;
  const owningOffice = isRecord(item.owning_office) ? item.owning_office : undefined;
  const currentOffice = isRecord(item.current_office) ? item.current_office : undefined;
  const completionPackage = isRecord(item.completion_package) ? item.completion_package : undefined;
  const routingMetadata = isRecord(item.routing_metadata) ? item.routing_metadata : undefined;

  const currentApproverName = currentApprover
    ? (() => {
        const fullName = `${asString(currentApprover.first_name, '')} ${asString(currentApprover.last_name, '')}`.trim();
        if (fullName.length > 0) return fullName;
        return asStringOptional(currentApprover.username);
      })()
    : undefined;

  const createdByName = createdBy
    ? (() => {
        const fullName = `${asString(createdBy.first_name, '')} ${asString(createdBy.last_name, '')}`.trim();
        if (fullName.length > 0) return fullName;
        return asStringOptional(createdBy.username);
      })()
    : undefined;

  const attachments = Array.isArray(item.attachments)
    ? item.attachments
        .filter(isRecord)
        .map((attachment) => ({
          id: normalizeId(attachment.id) ?? `${asString(item.id, 'cor')}-att-${Math.random().toString(36).slice(2)}`,
          fileName: asString(attachment.file_name, 'Attachment'),
          fileType: asStringOptional(attachment.file_type),
          fileSize: asNumberOptional(attachment.file_size),
          fileUrl: asStringOptional(attachment.file_url),
          createdAt: asStringOptional(attachment.created_at),
          updatedAt: asStringOptional(attachment.updated_at),
        }))
    : [];

  const distribution = Array.isArray(item.distribution)
    ? item.distribution
        .filter(isRecord)
        .map((recipient) => {
          const recipientTypeRaw = asString(recipient.recipient_type, 'division');
          const recipientType = asOneOf(recipientTypeRaw, ['office', 'directorate', 'department', 'user', 'division'] as const, 'division');
          const addedBy = isRecord(recipient.added_by) ? recipient.added_by : undefined;

          return {
            id: normalizeId(recipient.id) ?? `${asString(item.id, 'cor')}-dist-${Math.random().toString(36).slice(2)}`,
            type: recipientType,
            userId: recipientType === 'user' ? normalizeId(recipient.user ?? recipient.user_id) : undefined,
            officeId: normalizeId(recipient.office),
            directorateId: normalizeId(recipient.directorate),
            divisionId: normalizeId(recipient.division),
            departmentId: normalizeId(recipient.department),
            name:
              asStringOptional(recipient.user_name) ??
              asStringOptional(recipient.office_name) ??
              asStringOptional(recipient.directorate_name) ??
              asStringOptional(recipient.division_name) ??
              asStringOptional(recipient.department_name) ??
              undefined,
            addedById: normalizeId(recipient.added_by ?? recipient.added_by_id),
            addedByName: addedBy
              ? (() => {
                  const fullName = `${asString(addedBy.first_name, '')} ${asString(addedBy.last_name, '')}`.trim();
                  if (fullName.length > 0) return fullName;
                  return asStringOptional(addedBy.username);
                })()
              : undefined,
            addedAt: asStringOptional(recipient.created_at),
            purpose: asOneOfOptional(recipient.purpose, ['information', 'action'] as const),
            is_active: recipient.is_active !== false,
            readAt: asStringOptional(recipient.read_at),
            readBy: asStringOptional(
              recipient.read_by_id ??
                (recipient.read_by as { id?: string } | undefined | null)?.id,
            ),
          };
        })
    : [];

  const rawLinkedDocuments = Array.isArray(item.linked_document_ids)
    ? item.linked_document_ids
    : Array.isArray(item.linked_documents)
      ? item.linked_documents
      : [];
  const linkedDocumentIds = rawLinkedDocuments
    .map((doc) => normalizeId(doc))
    .filter((id): id is string => Boolean(id));

  const flowType = asOneOfOptional(
    item.flow_type,
    ['inward-internal', 'inward-external', 'outward-internal', 'outward-external'] as const
  );

  const workflowState = asOneOfOptional(item.workflow_state, ['sequential', 'parallel', 'merged', 'waiting_merge'] as const);

  const routingMetadataTyped =
    routingMetadata &&
    typeof routingMetadata.flowType === 'string' &&
    typeof routingMetadata.isInward === 'boolean' &&
    typeof routingMetadata.isOutward === 'boolean' &&
    typeof routingMetadata.isInternal === 'boolean' &&
    typeof routingMetadata.isExternal === 'boolean' &&
    typeof routingMetadata.should_appear_in_office_inbox === 'boolean' &&
    typeof routingMetadata.description === 'string'
      ? {
          flowType: routingMetadata.flowType,
          isInward: routingMetadata.isInward,
          isOutward: routingMetadata.isOutward,
          isInternal: routingMetadata.isInternal,
          isExternal: routingMetadata.isExternal,
          should_appear_in_office_inbox: routingMetadata.should_appear_in_office_inbox,
          description: routingMetadata.description,
        }
      : undefined;

  return {
    id: asString(item.id),
    referenceNumber: asString(item.reference_number),
    subject: asString(item.subject),
    bodyHtml: asStringOptional(item.body_html),
    treatmentResponse: asStringOptional(item.treatment_response),
    documentType: asStringOptional(item.document_type),
    senderReference: asStringOptional(item.sender_reference),
    letterDate: asStringOptional(item.letter_date),
    dispatchDate: asStringOptional(item.dispatch_date),
    acknowledgedDate: asStringOptional(item.acknowledged_date),
    lifecycleStages: Array.isArray(item.lifecycle_stages) ? item.lifecycle_stages.map((s: Record<string, unknown>) => ({
      key: asStringOptional(s.key) ?? "",
      label: asStringOptional(s.label) ?? "",
      index: typeof s.index === "number" ? s.index : 0,
      completed: s.completed === true,
      timestamp: asStringOptional(s.timestamp),
    })) : undefined,
    dispatchRecords: Array.isArray(item.dispatch_records) ? item.dispatch_records.map((r: Record<string, unknown>) => ({
      id: asStringOptional(r.id) ?? "",
      dispatchMode: asStringOptional(r.dispatch_mode) ?? "",
      dispatchedDate: asStringOptional(r.dispatched_date) ?? "",
      dispatchedByName: r.dispatched_by ? asStringOptional((r.dispatched_by as Record<string, unknown>).name) : undefined,
      trackingNumber: asStringOptional(r.tracking_number),
      courierName: asStringOptional(r.courier_name),
      recipientName: asStringOptional(r.recipient_name),
      acknowledgedDate: asStringOptional(r.acknowledged_date) ?? null,
      acknowledgedByName: r.acknowledged_by ? asStringOptional((r.acknowledged_by as Record<string, unknown>).name) : null,
      notes: asStringOptional(r.notes),
    })) : undefined,
    source: asOneOf(item.source, ['internal', 'external'] as const, 'internal'),
    receivedDate: asString(item.received_date),
    recipientName: asStringOptional(item.recipient_name),
    remarks: asStringOptional(item.remarks),
    completedAt: asStringOptional(item.completed_at),
    senderName: asString(item.sender_name),
    senderOrganization: asString(item.sender_organization),
    senderEmail: asStringOptional(item.sender_email),
    senderPhone: asStringOptional(item.sender_phone),
    status: asOneOf(item.status, ['pending', 'in-progress', 'completed', 'dispatched', 'acknowledged', 'archived', 'withdrawn'] as const, 'pending'),
    priority: asOneOf(item.priority, ['low', 'medium', 'high', 'urgent'] as const, 'medium'),
    divisionId: normalizeId(item.division ?? item.division_id),
    divisionName: asStringOptional(item.division_name) ?? (division ? asStringOptional(division.name) : undefined),
    departmentId: normalizeId(item.department ?? item.department_id),
    departmentName: asStringOptional(item.department_name) ?? (department ? asStringOptional(department.name) : undefined),
    directorateId: normalizeId(item.directorate ?? item.directorate_id),
    currentApproverId: normalizeId(item.current_approver ?? item.current_approver_id),
    createdById: normalizeId(item.created_by ?? item.created_by_id),
    direction: asOneOf(item.direction, ['upward', 'downward'] as const, 'upward'),
    currentApproverName,
    createdByName,
    isActingSeat: item.is_acting_seat === true,
    actingAppointmentId: normalizeId(item.acting_appointment_id ?? item.acting_appointment),
    actingOriginalApproverId: normalizeId(item.acting_original_approver_id ?? item.acting_original_approver),
    actingPrincipalName: asStringOptional(item.acting_principal_name),
    owningOfficeId: normalizeId(item.owning_office ?? item.owning_office_id),
    owningOfficeName: asStringOptional(item.owning_office_name) ?? (owningOffice ? asStringOptional(owningOffice.name) : undefined),
    currentOfficeId: normalizeId(item.current_office ?? item.current_office_id),
    currentOfficeName: asStringOptional(item.current_office_name) ?? (currentOffice ? asStringOptional(currentOffice.name) : undefined),
    attachments,
    distribution,
    parentCorrespondence: isRecord(item.parent_correspondence) ? {
      id: normalizeId(item.parent_correspondence.id) ?? '',
      reference_number: asString(item.parent_correspondence.reference_number),
      subject: asString(item.parent_correspondence.subject),
    } : null,
    archiveLevel: asOneOfOptional(item.archive_level, ['department', 'division', 'directorate'] as const),
    linkedDocumentIds,
    completionPackage: completionPackage
      ? {
          documentId: asString(completionPackage.document_id),
          title: asString(completionPackage.title),
          fileUrl: asStringOptional(completionPackage.file_url),
          generatedAt: asStringOptional(completionPackage.generated_at),
        }
      : null,
    completionSummaryGeneratedAt: asStringOptional(item.completion_summary_generated_at),
    caseId: asStringOptional(item.case_id),
    hasPhysicalCopy: item.has_physical_copy === true,
    physicalDocuments: Array.isArray(item.physical_documents)
      ? item.physical_documents.map((d: Record<string, unknown>) => ({
          id: asString(d.id),
          tracking_number: asString(d.tracking_number),
          status: asString(d.status),
          location: isRecord(d.location)
            ? { display_name: asString(d.location.display_name) }
            : undefined,
          checked_out_to: isRecord(d.checked_out_to)
            ? { name: asString(d.checked_out_to.name) }
            : undefined,
          created_at: asString(d.created_at),
        }))
      : undefined,
    workflowState,
    activeParallelBranches: asNumberOptional(item.active_parallel_branches),
    completedParallelBranches: asNumberOptional(item.completed_parallel_branches),
    flowType,
    isInward: typeof item.is_inward === 'boolean' ? item.is_inward : undefined,
    isOutward: typeof item.is_outward === 'boolean' ? item.is_outward : undefined,
    isInternal: typeof item.is_internal === 'boolean' ? item.is_internal : undefined,
    isExternal: typeof item.is_external === 'boolean' ? item.is_external : undefined,
    routingMetadata: routingMetadataTyped,
    isRead: typeof item.is_read === 'boolean' ? item.is_read : undefined,
    createdAt: asStringOptional(item.created_at),
    updatedAt: asStringOptional(item.updated_at),
  };
};

export const mapApiMinute = (item: ApiMinute): Minute => {
  const userObj = isRecord(item.user) ? item.user : undefined;
  const performedByObj = isRecord(item.performed_by) ? item.performed_by : undefined;
  const fromOfficeObj = isRecord(item.from_office) ? item.from_office : undefined;
  const toOfficeObj = isRecord(item.to_office) ? item.to_office : undefined;
  const toUserObj = isRecord(item.to_user) ? item.to_user : undefined;
  const sealDataObj = isRecord(item.seal_data) ? item.seal_data : undefined;

  // Extract user system role name (not UUID)
  let userSystemRole: string | undefined = userObj ? asStringOptional(userObj.system_role_name) : undefined;
  const userSystemRoleObj = userObj && isRecord(userObj.system_role) ? userObj.system_role : undefined;
  if (!userSystemRole && userSystemRoleObj) {
    userSystemRole = asStringOptional(userSystemRoleObj.name);
  }
  // Never use the UUID - if it looks like a UUID, set to undefined
  if (userSystemRole && userSystemRole.includes('-') && userSystemRole.length > 30) {
    userSystemRole = undefined;
  }

  const signaturePayload = isRecord(item.signature_payload) ? item.signature_payload : undefined;
  const signature: MinuteSignaturePayload | undefined = signaturePayload
    ? (() => {
        const imageData = asStringOptional(
          signaturePayload.imageData ?? signaturePayload.image_data ?? signaturePayload.image_url ?? signaturePayload.signature_url
        );
        const appliedAt = asStringOptional(signaturePayload.appliedAt ?? signaturePayload.applied_at);
        if (!imageData || !appliedAt) return undefined;
        return {
          imageData,
          appliedAt,
          fileName: asStringOptional(signaturePayload.fileName ?? signaturePayload.file_name),
          templateId: asStringOptional(signaturePayload.templateId ?? signaturePayload.template_id),
          templateType: asOneOfOptional(signaturePayload.templateType ?? signaturePayload.template_type, [
            'approval',
            'minute',
            'forward',
            'treatment',
          ] as const),
          renderedText: asStringOptional(signaturePayload.renderedText ?? signaturePayload.rendered_text),
        };
      })()
    : undefined;

  const assistantTypeUpper = typeof item.assistant_type === 'string' ? item.assistant_type.toUpperCase() : undefined;
  const assistantType = assistantTypeUpper === 'TA' ? 'TA' : assistantTypeUpper === 'PA' ? 'PA' : undefined;

  return {
    id: asString(item.id),
    correspondenceId: asString(item.correspondence ?? item.correspondence_id, ''),
    userId: normalizeId(item.user ?? item.user_id) ?? '',
    userName: userObj
      ? (() => {
          const fullName = `${asString(userObj.first_name, '')} ${asString(userObj.last_name, '')}`.trim();
          if (fullName.length > 0) return fullName;
          return asStringOptional(userObj.username) ?? undefined;
        })()
      : undefined,
    userEmail: userObj ? asStringOptional(userObj.email) : undefined,
    userSystemRole,
    gradeLevel: asString(item.grade_level),
    actionType: asOneOf(item.action_type, ['minute', 'forward', 'approve', 'reject', 'treat'] as const, 'minute'),
    minuteText: asString(item.minute_text),
    direction: asOneOf(item.direction, ['upward', 'downward'] as const, 'downward'),
    stepNumber: asNumberOptional(item.step_number) ?? 1,
    timestamp: asStringOptional(item.timestamp) ?? new Date().toISOString(),
    actedBySecretary: asBoolean(item.acted_by_secretary, false),
    actedByAssistant: asBoolean(item.acted_by_assistant, false),
    assistantType,
    performedById: normalizeId(item.performed_by ?? item.performed_by_id),
    performedByName:
      asStringOptional(item.performed_by_name) ??
      (performedByObj
        ? `${asString(performedByObj.first_name, '')} ${asString(performedByObj.last_name, '')}`.trim() ||
          asStringOptional(performedByObj.username)
        : undefined),
    readAt: asStringOptional(item.read_at),
    mentions: Array.isArray(item.mentions) ? item.mentions.filter((m): m is string => typeof m === 'string') : [],
    signature,
    fromOfficeId: normalizeId(item.from_office ?? item.from_office_id),
    fromOfficeName: asStringOptional(item.from_office_name) ?? (fromOfficeObj ? asStringOptional(fromOfficeObj.name) : undefined),
    toOfficeId: normalizeId(item.to_office ?? item.to_office_id),
    toOfficeName: asStringOptional(item.to_office_name) ?? (toOfficeObj ? asStringOptional(toOfficeObj.name) : undefined),
    toUserId: normalizeId(item.to_user ?? item.to_user_id),
    toUserName:
      asStringOptional(item.to_user_name) ??
      (toUserObj
        ? (() => {
            const fullName = `${asString(toUserObj.first_name, '')} ${asString(toUserObj.last_name, '')}`.trim();
            if (fullName.length > 0) return fullName;
            return asStringOptional(toUserObj.username);
          })()
        : undefined),
    // Recall/Edit fields
    isEdited: asBoolean(item.is_edited, false),
    editedAt: asStringOptional(item.edited_at),
    editWindowExpiresAt: asStringOptional(item.edit_window_expires_at),
    isOpened: asBoolean(item.is_opened, false),
    openedAt: asStringOptional(item.opened_at),
    originalMinuteText: asStringOptional(item.original_minute_text),
    editHistory: Array.isArray(item.edit_history) ? (item.edit_history as Minute['editHistory']) : [],
    canBeEdited: asBoolean(item.can_be_edited, false),
    isRecalled: asBoolean(item.is_recalled, false),
    recalledAt: asStringOptional(item.recalled_at),
    recallReason: asStringOptional(item.recall_reason),
    canBeRecalled: asBoolean(item.can_be_recalled, false),
    // Purpose-based routing
    purpose: asOneOfOptional(item.purpose, ['action', 'information', 'comment', 'approval'] as const) ?? 'action',
    requiresResponse: typeof item.requires_response === 'boolean' ? item.requires_response : undefined,
    responseDeadline: asStringOptional(item.response_deadline),
    // Parallel routing fields
    routingType: asOneOfOptional(item.routing_type, ['sequential', 'parallel', 'broadcast'] as const),
    parallelGroupId: normalizeId(item.parallel_group_id),
    isParallelBranch: typeof item.is_parallel_branch === 'boolean' ? item.is_parallel_branch : undefined,
    parentMinuteId: normalizeId(item.parent_minute ?? item.parent_minute_id),
    mergeStrategy: asOneOfOptional(item.merge_strategy, ['all', 'independent', 'any', 'majority'] as const),
    // Additional minutes/instructions
    minuteType: asOneOfOptional(item.minute_type, ['routing', 'instruction', 'clarification', 'addendum'] as const),
    isAdditional: typeof item.is_additional === 'boolean' ? item.is_additional : undefined,
    relatesToMinuteId: normalizeId(item.relates_to_minute ?? item.relates_to_minute_id),
    // Digital seal data (for executive approvals)
    sealApplied: normalizeId(item.seal_applied ?? item.seal_applied_id),
    sealData: sealDataObj
      ? {
          id: asString(sealDataObj.id),
          serialNumber: asString(sealDataObj.serial_number),
          verificationUrl: asString(sealDataObj.verification_url),
          sealedBy: asString(sealDataObj.sealed_by),
          officeName: asString(sealDataObj.office_name),
          officeTitle: asString(sealDataObj.office_title),
          sealedAt: asString(sealDataObj.sealed_at),
          isValid: typeof sealDataObj.is_valid === 'boolean' ? sealDataObj.is_valid : true,
          sealImageUrl: asStringOptional(sealDataObj.seal_image_url),
          signatureImageUrl: asStringOptional(sealDataObj.signature_image_url),
        }
      : undefined,
  };
};

export const mapApiDelegation = (item: Record<string, unknown>): Delegation => ({
  id: asString(item.id),
  correspondenceId: asStringOptional(item.correspondence) ?? '',
  principalId: normalizeId(item.principal ?? item.principal_id) ?? '',
  executiveId: normalizeId(item.principal ?? item.principal_id) ?? '', // Legacy
  assistantId: normalizeId(item.assistant ?? item.assistant_id) ?? '',
  assistantType: asString(item.assistant_type, 'PA').toUpperCase() === 'TA' ? 'TA' : 'PA',
  delegationNotes: asString(item.notes),
  delegatedAt: asStringOptional(item.created_at) ?? new Date().toISOString(),
  status: item.active === false ? 'revoked' : 'active',
  completedAt: asStringOptional(item.completed_at),
});
