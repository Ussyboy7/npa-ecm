# Physical Custody Handover Design

## Intent
Track where each physical copy is held and provide an auditable, recipient-confirmed handover between NPA offices. Correspondence remains registered once; paper custody is separate from digital minutes and routing.

## Goals
- Capture the initial custodian office and storage location when registering correspondence with a physical copy.
- Keep the existing physical tracking number linked to its correspondence reference.
- Let a member of the current custodian office initiate a handover to another active office.
- Mark the copy **In transit** until a member of the destination office confirms receipt and selects its physical location.
- Preserve handover history and surface pending deliveries to the destination office.
- Keep person checkout/check-in as a distinct, existing custody action.

## Non-goals
- Do not automatically move paper when a digital minute routes correspondence.
- Do not implement courier integration, signatures, notifications, bulk movements, or production deployment.
- Do not change correspondence registration/reference semantics.

## Approaches
1. Recipient-confirmed office handover (selected): records a pending transfer, then destination membership confirms receipt. Accurate custody state, with explicit receipt step.
2. Sender-recorded transfer: simpler, but cannot distinguish sent from received.
3. Couple paper movement to every digital minute: rejected because it would falsely imply physical delivery when only the digital record moved.

## Behavior and data
- Add a current custodian office to each physical record and an `in_transit` state.
- Add a handover record with physical document, source/destination offices, sender/receiver, sent/received timestamps, and notes.
- Only one pending handover per physical document. While pending, the source remains the recorded custodian; receipt atomically changes custodian, storage location, and status back to filed.
- Initiation requires an active membership in the current custodian office. Receipt requires an active membership in the destination office. Page-level physical-record authorization remains required.
- Registration with `has_physical_copy=true` requires the initial custodian office and active storage location. The physical copy is linked to that correspondence.
- Existing physical records without a known custodian/location remain unchanged and cannot start a handover until assigned through the existing edit/register affordance if supported; do not infer custody from correspondence ownership.

## UI
- Registration form asks for initial physical custodian office and location only when a physical copy is selected.
- Physical register shows current office and location, offers **Send to office** for filed records, and offers **Confirm receipt** for pending transfers visible to destination members; receipt requires a location.
- History shows transfer initiator, destination, sender/receiver, and timestamps alongside existing checkout history.
- Existing correspondence minute/routing UI is unchanged; correspondence details should expose linked physical tracking data where available.

## Constraints
- Follow existing Django REST Framework, React/Next.js, organization membership, permission, audit, and migration conventions.
- Preserve existing uncommitted changes. No commits, deploys, production writes, or destructive local database resets.
