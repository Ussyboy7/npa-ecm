# Sidebar Access and Archive Governance Design

## Intent

Make the sidebar a reliable map of pages each staff member is allowed to use, reduce duplicate entries with tabbed hubs, and make archive filing level consistently govern readers, unarchiving, and retention.

## Approved scope

1. **Navigation hubs:** one Approvals entry (existing level tabs); one Cases entry with My/Office/All tabs; one Documents entry with document and audit-form tabs; one Registry Records entry with Registered/Physical tabs (already represented by a shared nav entry; preserve and verify it). Keep the normal Dashboard; rename the second entry to Admin Overview.
2. **Authoritative page-access rules:** define named page rules in the backend permission catalog; use them both in backend route/query enforcement and in an authenticated frontend access response consumed by the sidebar and tab visibility. A hidden link is never the security boundary.
3. **Page gates:** remove Templates' case-section visibility bypass; require audit permission for the Audit Trail; move Forms into Documents while enforcing form-library permission; do not expose My Cases by default to every authenticated user; require the relevant role/seat/scope for each queue and administrative page.
4. **Role presets:** remove routine user/role/organisation administration powers from Assistant General Manager; grant System Administrator the full correspondence permission set as explicitly requested. Existing service startup force-seeds presets, so this intentionally updates matching seeded roles at restart. Do not grant office-seat membership automatically.
5. **Archive visibility:** completed but unfiled items remain visible by existing organisational/participation rules. Archived items are visible according to their recorded `archive_level` and filing unit, upward only: department-filed items can be read by the containing department, division, and directorate; division-filed items by the division and directorate; directorate-filed items by that directorate. Filing authority remains separate and uses level permission plus org scope.
6. **Unarchive:** add a reason-required, audited action for archived items only. Restore the exact status that preceded archiving (completed, dispatched, or acknowledged), clear the active filing level and archived timestamp, and preserve the prior/current values in audit metadata. No record or package is deleted.
7. **Retention and disposal:** resolve schedules in this order: explicit correspondence schedule; schedule matching current archive level and applicable org unit; existing scoped organisational fallback; global fallback. Due-disposal generation must consequently use the current archive level. Preserve legal-hold protections.
8. **Document ACL:** a division-level grant must reach a user with only `department_id` when that department belongs to the granted division, consistently in list/search and effective DRM rights.

## Non-goals

- No deletion of underlying pages or data models; hubs reorganise entry points.
- No automatic office membership or implicit seat-queue access for System Administrators.
- No revocation of prior package/user shares when archive level changes.
- No production deployment, role seeding against a live environment, or modification of live records.

## Design choices

- Use one backend page-access catalog as the policy source; frontend consumes the authenticated resolved rule set instead of reimplementing role/scope logic. Existing lower-level action permissions (edit, approve, archive at a specific level) remain action-specific and are not replaced by page visibility.
- Reuse existing tabs for Approvals and Registry records. Add query-param-backed tabs for Cases and Documents/Forms; preserve old URLs as redirects or route aliases to the corresponding hub tab.
- Represent pre-archive status explicitly so outward records return to their former lifecycle state. Keep archive-level changes and unarchive actions auditable.
- Keep unplaced legacy records archivable but unfiled; they remain on legacy org-scope visibility until assigned a filing level.

## Open implementation choices for the builder

- Exact existing permission keys should be reused when they accurately enforce a page; add a narrowly scoped view permission only where no existing key safely fits.
- Where a collection endpoint serves several page tabs, scope selection must be validated against the same page rule before returning data.
