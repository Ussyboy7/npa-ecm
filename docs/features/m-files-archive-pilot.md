# Future Read-Only M-Files Archive Pilot

**Status:** Discovery/planning only. No connector, API, schema, or UI implementation has started. Revisit when the team is ready to scope the pilot.

## Intent

Allow ECM users to view selected M-Files records from the existing archive experience without treating them as live correspondence or changing anything in M-Files. M-Files remains the source of truth for its records and files; ECM identifies the source and records access performed through ECM.

## Proposed user experience

Reuse the record-focused archive page, but make its sections source-aware:

- Show the M-Files source/vault and stable source record identity.
- Display mapped record metadata and retained files, with preview/download only when available and authorized.
- Show M-Files history only if the integration can retrieve it and can label it clearly as source history.
- Do not show live correspondence routing or imply M-Files records have ECM minutes, routing, completion packages, or ECM audit events they do not have.
- Preserve existing read-only behavior; the integration must not create, edit, delete, check out, or check in M-Files objects/files.

## Record identity and provenance

Use an ECM archive-record ID for the page, while retaining source identifiers separately:

- Source system: `M-Files`
- Vault GUID (and a human-readable vault name)
- Object type and object ID, preserving external IDs as returned
- Resolved object version shown/downloaded
- Source reference number as a mapped display field, not as the ECM primary key

Display provenance to the user and retain the source identifiers with each imported/indexed record. M-Files REST resource paths use object type, object ID, and an optional version; `latest` can refer to the current version, so record the resolved version where feasible.

## Field mapping

Map only fields confirmed for the selected vault and class. Likely display fields are:

| ECM display concept | M-Files source |
|---|---|
| Title / subject | Configured title property or object title |
| Reference | Configured reference property |
| Record type / classification | Object type and class |
| Dates | Explicitly selected date properties, with source meaning retained |
| Organizational filing details | Department, division, owner, or other configured properties where values map reliably |
| Files | Object-version file metadata and file content retrieved through M-Files |
| Provenance / source history | Vault, object, version identifiers; source history only if validated |

Property IDs and meanings are vault-specific. Keep source property identifiers/values available for traceability, and do not infer missing ECM workflow fields.

## Secure file access and authorization

All M-Files access should be server-side through the ECM backend:

1. Browser requests a file using an ECM archive/file identifier.
2. ECM verifies the signed-in user's permission for the imported record and requested action.
3. Backend fetches and streams the file from M-Files.
4. No M-Files credentials, authentication token, or direct source URL is sent to the browser.

Use a dedicated, least-privilege identity with read-only access limited to the pilot scope. The M-Files REST guidance recommends authentication tokens rather than repeating raw credentials, and calls out handling rejected/expired tokens. Multi-server/cloud deployments may require session stickiness; confirm the actual environment's behavior. Do not assume a shared service identity enforces each ECM user's M-Files permissions: this is a key authorization decision and potential access-expansion risk.

## Auditability

ECM should log each view/download attempt made through ECM, including ECM user, timestamp, ECM archive record ID, vault/object/version identifiers, file identifier/name for file access, operation, result, and correlation/request ID. Include denials and failures. Keep ECM access logs distinct from M-Files' authoritative history; do not represent one as a replacement for the other.

## Sync versus on-demand

**Pilot recommendation: on-demand reads.** Retrieve record metadata and file listings when a user opens the record; retrieve file bytes only for preview/download. A short-lived metadata cache may be considered only if needed and must display/track freshness. Do not mirror file bytes in the initial pilot.

If the pilot later demonstrates a need for archive search during source outages or faster list pages, consider a metadata-only index with explicit freshness, invalidation, and source-permission-revocation behavior. Treat durable file caching as a separate decision with retention and purge requirements.

## Discovery checklist

### M-Files administrator

- [ ] Provide vault name/GUID, environment, and REST base URL.
- [ ] Confirm the M-Files Web Service is enabled and reachable from the ECM backend; identify network allowlists, proxy requirements, and deployment mode (including Cloud/multi-server).
- [ ] Specify supported authentication, secure credential provisioning, token expiry/renewal, and any session-affinity requirements. Do not share passwords/tokens in email or chat.
- [ ] Create/identify a dedicated read-only pilot identity restricted to the pilot vault/class and files; explain how M-Files object/file ACLs apply.
- [ ] Identify one target object type/class (name and ID) and the exact in-scope record filter.
- [ ] Provide property IDs and meanings for title, reference, classification, relevant dates, and organizational filing fields.
- [ ] Provide representative records and sample files, including multiple files, relevant types, versions, and any restricted-access cases.
- [ ] Confirm whether the pilot account can read object version/history and what source events/fields are available.

### ECM team

- [ ] Provide an authorized ECM test account and an ECM account expected to be denied; document expected access for each.
- [ ] Agree on the ECM/source identity tuple and whether source versions are pinned or resolve to latest per request.
- [ ] Agree on archive-page behavior for unavailable source metadata/history and records without ECM minutes/routing/completion packages.
- [ ] Define ECM audit fields, log retention, permitted file types/maximum size, and whether any metadata cache is acceptable.
- [ ] Confirm the read-only boundary explicitly: no create/update/delete/check-out/check-in operations.
- [ ] Agree on acceptance checks for allowed/denied reads, preview/download, expired/rejected auth, source outage, version attribution, and access logging.

## Ranked next steps

1. **Resolve the authorization model.** Decide whether access is per-user or through a shared read-only identity. If shared, specify how ECM enforces source-equivalent access and prevents widening access.
2. **Validate technical feasibility in the actual environment.** Confirm REST availability, authentication/token renewal, session affinity if applicable, and read calls for the selected class, properties, versions, and files.
3. **Set the pilot's security/data boundaries.** Classify sample data, define file-size/type limits, source-host allowlisting, audit retention, cache policy, and incident ownership.
4. **Approve identity, field, and version rules.** Confirm property IDs and behavior for changed, moved, deleted, reclassified, or duplicate source records.
5. **Specify source-aware UI and failure states.** Make provenance/freshness visible and distinguish M-Files history from ECM audit activity; do not imply unsupported workflow.
6. **Agree on a go/no-go test matrix.** Test authorized and denied accounts, representative files, version attribution, authentication expiry, audit events, and source outage; document disable/rollback steps.
7. **Measure before adding sync.** Start on demand; add a metadata index only if pilot evidence shows a search, latency, or availability need. Keep file caching out of scope unless separately approved.

## Open questions / risks to resolve

- Can ECM reliably honor each user's M-Files object and file permissions, or would a service identity create broader visibility?
- What is authoritative for retention, deletion, legal holds, and source permission revocation?
- What should ECM show if access is revoked after metadata is indexed or cached?
- Which M-Files server versions/deployment modes must be supported, and is REST enabled for them?
- Is M-Files history accessible through the chosen REST setup, and what exactly may ECM display?
- Who owns connector credentials, rotation, monitoring, outage response, and user support?
- Are file bytes ever allowed to be cached, and if so, what expiry and purge guarantees are required?

## Discovery completion gate

Do not begin implementation until the M-Files administrator and ECM team have agreed on the vault and REST endpoint, read-only authorization model, target class/property IDs, representative sample records/files, authorized and denied test accounts, audit expectations, and pilot acceptance criteria.

## References

- [M-Files REST API overview](https://developer.m-files.com/APIs/REST-API/) — service availability/configuration and API scope.
- [M-Files REST authentication](https://developer.m-files.com/APIs/REST-API/Authentication) — authentication options, token use, expiry, and multi-server considerations.
- [M-Files REST resource reference](https://developer.m-files.com/APIs/REST-API/Reference/resources) — object, version, and file resource hierarchy; validate exact routes/behavior against the pilot environment before implementation.
- [M-Files object version resource](https://developer.m-files.com/APIs/REST-API/Reference/resources/objects/type/objectid/version/) — object version retrieval and `latest` behavior.
