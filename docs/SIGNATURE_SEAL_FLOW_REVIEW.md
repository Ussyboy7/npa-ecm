# Digital Signature & Executive Seal – Holistic Review

Critical review of the end-to-end flow: **Settings (Signature & Seal)**, **Minute Modal (Approve)**, **Minute Details**, and **Executive Approvals**.

---

## 1. Architecture Overview

| Layer | Purpose | Backend | Frontend |
|-------|---------|---------|----------|
| **ExecutiveSignature** | Store executive’s signature image + seal settings | `accounts.ExecutiveSignature` (DB), `POST/GET/PATCH/DELETE /accounts/signature/` | Settings → Signature tab (`SignatureSettingsCard`) |
| **signature_payload** (Minute) | Store inline signature for **non‑executive** approvals | `Minute.signature_payload` JSON | MinuteModal sends `{ imageData, appliedAt, fileName, templateId, templateType, renderedText }` |
| **DocumentSeal + seal_applied** | Seal record for **executive** APPROVE minutes | `accounts.DocumentSeal`, `Minute.seal_applied` FK | Minute Details (SealBadge), Executive Approvals list |
| **Seal application** | Create seal when an executive approves | `SealGenerationService.generate_seal()` in MinuteViewSet `create` | N/A – backend-only after minute create |

---

## 2. Settings → Signature (`SignatureSettingsCard`)

### Flow
- **Load**: `fetchUserSignature()` → `GET /accounts/signature/` → `ExecutiveSignatureSerializer` (signature_url, seal_office_name, seal_office_title, seal_prefix, require_2fa, times_used, last_used_at, etc.).
- **Upload**: `uploadUserSignature(file, { sealOfficeName, sealOfficeTitle, sealPrefix, require2fa })` → `POST /accounts/signature/` (FormData).
- **Seal settings**: `updateSignatureSettings({ sealOfficeName, sealOfficeTitle, sealPrefix, require2fa })` → `PATCH /accounts/signature/`.
- **Delete**: `deleteUserSignatureFromBackend()` → `DELETE /accounts/signature/`.

### Fixes applied
- **Current Signature image**: `signature.imageData` can be a `/media/` URL from `signature_url`. `buildDownloadUrl(imageData)` is now used when it’s not a `data:` URL so the image loads correctly from the API origin.

### Backend
- `ExecutiveSignature`: `signature_image` (ImageField), `seal_office_name`, `seal_office_title`, `seal_prefix`, `require_2fa`, `times_used`, `last_used_at`, `is_active`.
- `get_signature_url`: `request.build_absolute_uri(obj.signature_image.url)` when `request` is present; otherwise `obj.signature_image.url` (can be relative).

### Seal Preview tab
- `DigitalSealPreview` gets `signatureImage={signature.imageData}`. If `imageData` is a full URL from `build_absolute_uri`, it should work. For relative `/media/` URLs, `DigitalSealPreview` would need to resolve them similarly; currently it assumes a loadable URL or data URL.

---

## 3. Seal Preview page (`/seal-preview`)

- Demo page with `signatureText="Signature"` (no `signatureImage`). Used for template/UX preview, not live user signature.
- Does not call `/accounts/signature/`.

---

## 4. Minute Modal – Approve

### Executive (seal path)
- **Detection**: `isExecutive` from `useRoleChecks` or similar (MD/ED grade or role).
- **UI**: `SignatureSection` in “Digital Executive Seal” mode: `DigitalSealPreview` with `signatureImage={signature.imageData}`. No template/renderedText in the seal; seal is generated on the backend.
- **Submit**: Minute is created with `signature_payload` only if `applySignature && userSignature`; for executives the backend also runs the **seal path**.
- **Backend (seal)**: In `MinuteViewSet.create` (or equivalent), after saving the minute:
  - `action_type == APPROVE`
  - `is_executive`: grade in `['MDCS','EDCS','MSS1','MSS2','MSS3']`, or role contains `MANAGING DIRECTOR`/`EXECUTIVE DIRECTOR`/`GENERAL MANAGER`/`PRINCIPAL MANAGER`, or `user.is_management=True`.
  - `ExecutiveSignature.objects.get(user=request.user, is_active=True)` → if exists, `SealGenerationService.generate_seal(user=request.user, correspondence=correspondence, request=request)` → `DocumentSeal` created, `minute.seal_applied = seal`, `minute.save(update_fields=['seal_applied'])`.
  - If `ExecutiveSignature.DoesNotExist` or `generate_seal` raises: seal is **not** applied; approval still succeeds. No `seal_applied` → minute won’t appear in Executive Approvals and Minute Details will use **signature_payload** (and the signature-image endpoint) instead of the seal.

### Non‑executive (signature_payload only)
- **Submit**: `signaturePayload = { imageData: userSignature.imageData, appliedAt, fileName, templateId, templateType, renderedText }`; `userSignature.imageData` comes from `fetchUserSignature` → `signature_url` (often a URL). This is stored in `Minute.signature_payload`.
- **Display**: Minute Details uses `minute.signature` and, for non–data URLs, `GET /correspondence/minutes/:id/signature-image/` (blob) to avoid CORS/auth issues with `/media/`.

---

## 5. Minute Details

- **If `minute.sealData`**: show “Digital Executive Seal” and `SealBadge` (no separate signature image block).
- **Else if `minute.signature`**:
  - **Image**:  
    - `data:` → use as `img` `src`.  
    - Otherwise → `GET /correspondence/minutes/:id/signature-image/` with `responseType: 'blob'` → `URL.createObjectURL(blob)` → `img` `src`.  
  - **Metadata**: Applied at, Source file, Template ID, Type, `renderedText`.

### Backend `GET /correspondence/minutes/:id/signature-image/`
- Reads `signature_payload` (`imageData` / `image_data` / `image_url` / `signature_url`).
- `data:image...;base64,...` → decode and return with appropriate `Content-Type`.
- `http(s)://` → if URL contains `/media/`, extract path and serve via `default_storage.open()` first (avoids self-request/auth); otherwise fetch and stream.
- `/media/...` or `signatures/...` → `default_storage.open(...)` or `MEDIA_ROOT` path.
- Uses `minute.seal_applied` only indirectly (not for this endpoint). This endpoint is for `signature_payload`.

---

## 6. Executive Approvals (`/approvals`)

### API
- `GET /correspondence/minutes/?action_type=approve&has_seal=true&page=...&page_size=...&ordering=-timestamp`
- `has_seal=true` → `Minute` with `seal_applied__isnull=False` and `seal_applied__is_valid=True`.
- Pagination: `OfficeInboxPagination` → `{ count, next, previous, results }`.

### Frontend
- Maps `results` and `seal_data` to `ExecutiveApproval` (sealedBy, officeName, officeTitle, sealedAt, serialNumber, verificationUrl, isValid, sealData with `sealImageUrl` / `signatureImageUrl` for `SealBadge` / `DigitalSealPreview`).
- **View PDF**: `apiFetch(\`/correspondence/minutes/${approval.id}/approval-pdf/\`, { responseType: 'blob' })`.  
  **Fix**: do **not** pass `getBaseUrl() + path` into `apiFetch`; `apiFetch` already prefixes `getBaseUrl()`. Use only the path.

### Why “Approvals (0)”?
- Only minutes with `action_type=approve` **and** `seal_applied` (valid) are included.
- `seal_applied` is set only when:
  1. **`is_executive`**: grade in `['MDCS','EDCS','MSS1','MSS2','MSS3']` (MD, ED, GM, AGM, Principal Manager), or role contains "Managing Director"/"Executive Director"/"General Manager"/"Principal Manager", or `user.is_management=True`. This aligns with who can see the Executive Approvals page.
  2. **`ExecutiveSignature`** exists and `is_active=True` for the approver (Settings → Signature must be configured **before** approving).
  3. **`SealGenerationService.generate_seal()`** runs without raising.

If the approver had no `ExecutiveSignature` at approve time (or it was inactive), or `generate_seal` failed, the minute is stored **without** `seal_applied` and does **not** appear on Executive Approvals. It can still have `signature_payload` and show in Minute Details with the "Digital Signature" block and the signature-image endpoint.

**Note:** Approvals created by GM/AGM/Principal Manager (MSS1/MSS2/MSS3) *before* the `is_executive` widen did not get `seal_applied` and will not appear. Only **new** approvals from those grades (and from users with `is_management=True`) will get seals and show in the list.

---

## 7. Database (reference)

- **accounts_executivesignature**: `user_id`, `signature_image`, `seal_office_name`, `seal_office_title`, `seal_prefix`, `require_2fa`, `times_used`, `last_used_at`, `is_active`, ...
- **accounts_documentseal**: `correspondence_id`, `sealed_by_id`, `signature_used_id`, `serial_number`, `seal_hash`, `verification_url`, `seal_image` (nullable), `office_name`, `office_title`, `sealed_at`, `is_valid`, ...
- **correspondence_minute**: `signature_payload` (JSON), `seal_applied_id` (FK to `accounts_documentseal`).

---

## 8. Settings page (parent) – legacy

- The main Settings page still has `handleSignatureUpload`, `handleSignatureDelete`, `loadUserSignature` (localStorage), and `signature` state. The **Signature** tab renders only `SignatureSettingsCard`, which uses the **backend** APIs. The parent’s upload/delete and `loadUserSignature` are effectively unused for that tab. Consider removing or clearly marking as legacy to avoid confusion.

---

## 9. Checklist

| Item | Status |
|------|--------|
| SignatureSettingsCard: resolve `imageData` URL for Current Signature | ✅ `buildDownloadUrl` when not `data:` |
| Minute Details: signature image for `signature_payload` | ✅ `/minutes/:id/signature-image/` + blob → object URL |
| Executive Approvals: View PDF uses path-only in `apiFetch` | ✅ `/correspondence/minutes/:id/approval-pdf/` |
| Executive Approvals: show only `action_type=approve` and `has_seal=true` | ✅ backend filter |
| Seal applied only for APPROVE + is_executive + ExecutiveSignature | ✅ in `MinuteViewSet.create` |
| `CorrespondenceContext`: `imageData` from `image_url` / `signature_url` | ✅ fallbacks |
| `signature-image`: resolve `http(s)://.../media/...` via storage | ✅ avoid self-fetch/auth |
| `is_executive`: grades MDCS, EDCS, MSS1, MSS2, MSS3 + roles + `is_management` | ✅ aligned with Executive Approvals visibility |

---

## 10. Implementation Summary

- **Backend `signature-image`**  
  For `imageData` that is an `http(s)://` URL containing `/media/`, the path after `/media/` is extracted and served via `default_storage.open()` instead of fetching the URL. This avoids self-request or auth issues when `signature_url` is a full backend media URL stored in `signature_payload`.

- **Backend seal `is_executive`**  
  `user_grade` is normalized with `(getattr(user, 'grade_level', None) or '').strip().upper()` so that `MDCS`/`EDCS` (and case variants) are matched reliably. `user_role` is normalized similarly.

- **Minute Details approval logo**  
  The logo is served by `GET /correspondence/minutes/:id/signature-image/`. The frontend uses it when `minute.signature.imageData` is not a `data:` URL. Ensuring the backend resolves `signature_url`-style and `/media/`-style `imageData` makes the image load correctly.

- **Executive Approvals (0)**  
  Approvals only include minutes with `seal_applied`. `seal_applied` is set when: `action_type=APPROVE`, `is_executive` (grade MDCS/EDCS/MSS1/MSS2/MSS3, or role, or `is_management`), and `ExecutiveSignature` exists and `SealGenerationService.generate_seal()` succeeds. The approver must have an active signature in Settings → Signature **before** approving. Existing approve minutes created by GM/AGM/PM before the `is_executive` widen do not have `seal_applied` and will not appear; only new approvals will.

---

## 11. Recommendations

1. **Executive with `signature_payload` but no seal**  
   - Ensure they have an active `ExecutiveSignature` in Settings → Signature **before** approving.  
   - If they already approved without it, that minute will only use `signature_payload`; the signature-image endpoint will serve it. New approvals will get a seal once `ExecutiveSignature` exists.

2. **Executive Approvals (0)**  
   - Confirm there are APPROVE minutes with `seal_applied` in the DB.  
   - If none: check that approvers are detected as `is_executive` and have `ExecutiveSignature` at approve time.  
   - Optional: in the backend, when `ExecutiveSignature.DoesNotExist` for an APPROVE by an executive, return a distinct message or set a `_seal_skipped` flag so the frontend can show “Seal not applied – add signature in Settings” or similar.

3. **`DigitalSealPreview` with URL `signatureImage`**  
   - If `signature_url` is ever relative (`/media/...`), `DigitalSealPreview` may fail to load it. Consider resolving via `buildDownloadUrl` (or an equivalent) before passing `signatureImage`, or handling relative URLs inside the component.

4. **Settings parent**  
   - Remove or clearly deprecate the localStorage-based signature upload/delete and `loadUserSignature` used only for the (unused) parent `signature` state to avoid two sources of truth.
