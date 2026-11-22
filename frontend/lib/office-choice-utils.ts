export interface OfficeChoice {
  id: string;
  isActive: boolean;
}

export function getFirstActiveOfficeId<T extends OfficeChoice>(
  offices: readonly T[],
  preferredOfficeIds: readonly string[],
): string | undefined {
  return preferredOfficeIds.find((id) =>
    offices.some((office) => office.id === id && office.isActive),
  );
}

export interface OfficeChoiceOptions {
  allowedOfficeIds?: ReadonlySet<string>;
  selectedOfficeId?: string | null;
}

/** Return active offices in scope, retaining an inactive choice only when selected. */
export function getSelectableOffices<T extends OfficeChoice>(
  offices: readonly T[],
  { allowedOfficeIds, selectedOfficeId }: OfficeChoiceOptions = {},
): T[] {
  return offices.filter((office) => {
    if (allowedOfficeIds && !allowedOfficeIds.has(office.id)) return false;
    return office.isActive || office.id === selectedOfficeId;
  });
}
