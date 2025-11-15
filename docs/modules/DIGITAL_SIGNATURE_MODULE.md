# Digital Signature Module - Discussion & Requirements

## Overview
The Digital Signature Module will enable users to apply digital signatures and approval stamps to correspondence and documents during the approval/minuting workflow.

### Confirmed Requirements
- **Signature requirement**: Every approval action must include a digital signature (MD/ED/GM and all other approvers).
- **Template customization**: Signature templates are customisable by both administrators (for organisation-wide defaults) and end users (personal overrides).
- **Storage strategy (Phase 1)**: Persist signatures in local storage for now, with a planned migration to secure backend storage when the API layer lands.
- **Stamp application**: Support both auto-applied stamps (default) and manual apply/override options per approval action.
- **Verification & compliance**: Baseline signature verification/tamper detection must be included, even in the initial release.

## Core Features

### 1. Scanned Signatures
- **User Signature Upload**
  - Users can upload/scan their signature image (PNG, JPG, SVG)
  - Signature stored securely per user
  - Support for multiple signature styles (formal, initial, etc.)
  - Signature preview and management

- **Signature Storage**
  - Store in user profile/settings
  - Encrypted storage for security
  - Version control (users can update signatures)
  - Audit trail of signature changes

### 2. Signature Templates
- **Role-Based Templates**
  - Pre-defined signature templates for different grade levels
  - Templates include: Name, Title, Grade Level, Division/Department
  - Auto-populated from user profile
  - Customizable templates per role

- **Template Types**
  - **Formal Signature**: Full name, title, grade level, date
  - **Approval Stamp**: "APPROVED BY" with signature
  - **Minute Stamp**: "MINUTED BY" with signature
  - **Department Stamp**: Department name with authorized signatory

- **Template Management**
  - Admin can create/edit templates
  - Templates assigned to grade levels or roles
  - Users can select template when signing

### 3. Approval Stamping
- **Automatic Stamping**
  - Apply signature when approving/minuting correspondence
  - Stamp includes: Signature, Name, Title, Date, Time
  - Embedded in document metadata
  - Visible in print/download versions

- **Stamp Types**
  - **Approval Stamp**: "APPROVED BY [Name] [Signature] [Date]"
  - **Minute Stamp**: "MINUTED BY [Name] [Signature] [Date]"
  - **Forward Stamp**: "FORWARDED BY [Name] [Signature] [Date]"
  - **Treatment Stamp**: "TREATED BY [Name] [Signature] [Date]"

- **Stamp Placement**
  - Bottom of minute text
  - On printed/downloaded documents
  - In routing chain visualization
  - In completion summary

## Integration Points

### 1. MinuteModal Integration
- **Signature Selection**
  - Option to apply signature when minuting/approving
  - Select signature template or use scanned signature
  - Preview signature before applying
  - Optional: Require signature for approvals

- **Stamp Application**
  - Automatically add stamp when actionType is 'approve'
  - Include signature in minute metadata
  - Store signature hash for verification

### 2. Document Generation
- **Print/Download Integration**
  - Include signatures in generated PDF/Word documents
  - Stamp placement on document pages
  - Signature verification metadata
  - Tamper-evident features

### 3. Correspondence Detail View
- **Signature Display**
  - Show signatures in routing chain
  - Display signature in minute details
  - Signature verification status
  - Signature timestamp

## Data Model

### User Signature
```typescript
type UserSignature = {
  id: string;
  userId: string;
  signatureImage: string; // Base64 or file path
  signatureType: 'scanned' | 'template' | 'digital';
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: number;
};
```

### Signature Template
```typescript
type SignatureTemplate = {
  id: string;
  name: string;
  description: string;
  templateType: 'approval' | 'minute' | 'forward' | 'treatment';
  gradeLevels: string[]; // Which grade levels can use this
  template: {
    format: string; // "APPROVED BY {name} {signature} {date}"
    fields: string[];
    style: 'formal' | 'stamp' | 'minimal';
  };
  isDefault: boolean;
};
```

### Minute Signature (Extended)
```typescript
type Minute = {
  // ... existing fields
  signature?: {
    imageData: string;
    appliedAt: string;
    fileName?: string;
    templateId?: string;
    templateType?: 'approval' | 'minute' | 'forward' | 'treatment';
    renderedText?: string;
  };
};
```

## UI Components Needed

### 1. Signature Management Page
- **Location**: `/settings/signatures` or `/admin/signatures`
- **Features**:
  - Upload/scan signature
  - Preview signature
  - Select default signature
  - Manage signature templates
  - View signature history

### 2. Signature Selector Component
- **Usage**: In MinuteModal, TreatmentModal
- **Features**:
  - Select signature type (scanned/template)
  - Preview signature
  - Apply signature checkbox
  - Signature template dropdown

### 3. Signature Display Component
- **Usage**: In correspondence detail, routing chain
- **Features**:
  - Display signature image
  - Show signature metadata
  - Verification status
  - Timestamp

### 4. Approval Stamp Component
- **Usage**: In document generation, print preview
- **Features**:
  - Render stamp with signature
  - Position stamp on document
  - Include metadata (name, date, title)

## Security Considerations

### 1. Signature Verification
- **Hash Generation**: Create hash of signature + document content
- **Tamper Detection**: Verify signature hasn't been altered
- **Timestamp**: Include timestamp in signature
- **Audit Trail**: Log all signature applications

### 2. Access Control
- **Signature Upload**: Only user can upload their own signature
- **Template Management**: Only admins can manage templates
- **Signature Viewing**: Users can view signatures on documents they have access to

### 3. Data Protection
- **Encryption**: Encrypt signature images at rest
- **Secure Storage**: Store signatures securely (not in localStorage)
- **Backup**: Regular backup of signatures

## Implementation Phases

### Phase 1: Basic Signature Upload & Display
- User signature upload
- Signature storage
- Display signature in minute details
- Basic signature selector in MinuteModal

### Phase 2: Signature Templates
- Template management (admin) UI for organization defaults ✅
- Template customisation for end users (personal overrides) ✅
- Template selection in workflow (MinuteModal) ✅
- Auto-populated template preview with context placeholders ✅
- Template persistence in local storage (pending backend integration) ✅

### Phase 3: Approval Stamping
- Automatic stamp application
- Stamp in document generation
- Stamp in print preview
- Stamp in routing chain

### Phase 4: Advanced Features
- Signature verification
- Tamper detection
- Multiple signature styles
- Signature analytics

## Questions for Discussion

1. **Signature Requirements**
   - Should signatures be required for all approvals, or optional?
   - Should different actions (approve vs minute) have different signature requirements?
   - Should MD/ED approvals always require signatures?

2. **Template Customization**
   - Should users be able to customize templates, or use admin-defined only?
   - Should templates be role-based or grade-level-based?
   - Should there be organization-wide templates?

3. **Signature Storage**
   - Where should signatures be stored? (localStorage, backend, cloud storage)
   - Should signatures be encrypted?
   - How should signature updates be handled?

4. **Stamping Behavior**
   - Should stamps be automatically applied, or user-selected?
   - Should stamps appear on all documents or only printed/downloaded?
   - Should stamps be visible in the UI or only in documents?

5. **Verification & Compliance**
   - Do we need signature verification/authentication?
   - Should signatures be legally binding?
   - What compliance requirements exist?

## Next Steps

1. **Clarify Requirements**: Answer questions above
2. **Design UI Mockups**: Create designs for signature management
3. **Define Data Model**: Finalize data structures
4. **Plan Integration**: Detail integration with existing workflow
5. **Security Review**: Review security requirements
6. **Implementation**: Start with Phase 1

