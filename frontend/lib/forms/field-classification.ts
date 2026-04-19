import type { FormField } from "@/lib/types/forms";

const SIGNATURE_NAME_PATTERN = /signature|digital_seal|seal/i;

const getSignaturePrefix = (name: string): string | null => {
  if (name.endsWith("_signature")) {
    return name.slice(0, -"_signature".length);
  }
  return null;
};

export const isSignatureFileField = (field: FormField): boolean => {
  if (field.type !== "file") return false;
  if (field.is_signature_field === true) return true;

  const name = field.name.toLowerCase();
  const label = field.label.toLowerCase();
  return SIGNATURE_NAME_PATTERN.test(name) || SIGNATURE_NAME_PATTERN.test(label);
};

export const isWorkflowCollectedFieldExplicit = (field: FormField): boolean =>
  field.workflow_collected === true || field.is_signature_field === true;

export const getWorkflowCollectedFieldNames = (fields: FormField[]): Set<string> => {
  const collected = new Set<string>();
  const signaturePrefixes = new Set<string>();

  fields.forEach((field) => {
    if (isWorkflowCollectedFieldExplicit(field)) {
      collected.add(field.name);
    }

    if (isSignatureFileField(field)) {
      collected.add(field.name);
      const prefix = getSignaturePrefix(field.name.toLowerCase());
      if (prefix) signaturePrefixes.add(prefix);
    }
  });

  // Legacy compatibility: if template uses *_signature pattern, treat companion fields
  // as workflow-collected too.
  fields.forEach((field) => {
    const name = field.name.toLowerCase();
    for (const prefix of signaturePrefixes) {
      if (
        name === `${prefix}_name` ||
        name === `${prefix}_pn` ||
        name === `${prefix}_designation` ||
        name === `${prefix}_date`
      ) {
        collected.add(field.name);
      }
    }
  });

  return collected;
};
