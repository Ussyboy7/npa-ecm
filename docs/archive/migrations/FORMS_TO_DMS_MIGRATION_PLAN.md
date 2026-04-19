# Forms to DMS Migration Plan

## Overview
Moving forms and checklists from the correspondence system to DMS makes architectural sense because:
- **DMS = Document Creation & Collaboration**: Forms need multi-user collaboration, versioning, comments, and signatures
- **Correspondence = Document Routing**: Once forms are complete (as PDFs), they're routed through correspondence for approval

## Current State

### Forms System (Current)
- **Location**: `backend/forms/`, `frontend/components/forms/`
- **Features**: Form templates, submissions, signature workflows, PDF generation
- **Integration**: Embedded in correspondence registration page

### DMS System (Existing)
- **Location**: `backend/dms/`, `frontend/app/dms/`
- **Features**: Documents, versions, permissions, comments, collaboration
- **Document Types**: Letter, Memo, Circular, Policy, Report, Other

## Proposed Architecture

### 1. Forms as DMS Documents
```
DMS Document (type: FORM)
├── FormTemplate reference
├── Form data (JSON)
├── Status (draft, in_progress, completed)
├── Signature workflow
├── Versions (each edit/signature creates new version)
├── Comments (collaboration)
└── Permissions (who can edit/sign)
```

### 2. Workflow
```
1. User creates form in DMS
   └── Selects form template
   └── Fills initial data
   └── Shares with collaborators

2. Collaboration in DMS
   └── Multiple users can edit/review
   └── Comments and discussions
   └── Version history tracked

3. Signature Workflow
   └── Route for signatures (sequential/parallel)
   └── Users sign in DMS
   └── Each signature creates new version

4. Generate PDF
   └── Once all signatures complete
   └── Generate PDF as new DocumentVersion
   └── Mark document as "completed"

5. Link to Correspondence
   └── User can attach completed PDF to correspondence
   └── Correspondence handles routing/approval
   └── PDF is sent through normal correspondence workflow
```

## Implementation Plan

### Phase 1: Extend DMS for Forms

#### Backend Changes

1. **Add FORM to Document Types**
   ```python
   # backend/dms/models.py
   class DocumentType(models.TextChoices):
       # ... existing types
       FORM = "form", "Form"
   ```

2. **Create FormDocument Model** (extends Document)
   ```python
   class FormDocument(UUIDModel, TimeStampedModel):
       """Form-specific document that extends DMS Document."""
       
       document = models.OneToOneField(
           Document,
           on_delete=models.CASCADE,
           related_name="form_document"
       )
       template = models.ForeignKey(
           "forms.FormTemplate",
           on_delete=models.SET_NULL,
           null=True,
           related_name="form_documents"
       )
       form_data = models.JSONField(default=dict)
       status = models.CharField(
           max_length=32,
           choices=[
               ("draft", "Draft"),
               ("in_progress", "In Progress"),
               ("awaiting_signatures", "Awaiting Signatures"),
               ("completed", "Completed"),
           ],
           default="draft"
       )
       signature_workflow = models.ForeignKey(
           "forms.FormSignatureWorkflow",
           on_delete=models.SET_NULL,
           null=True,
           blank=True,
           related_name="form_documents"
       )
   ```

3. **Update DMS Views**
   - Add form-specific endpoints
   - Integrate form template selection
   - Handle form data updates

#### Frontend Changes

1. **Create Form Document Type in DMS**
   - Add "Form" option to document type selector
   - Form creation flow in DMS

2. **Form Filling in DMS**
   - Move `DynamicFormRenderer` to DMS
   - Integrate into DMS document detail page
   - Use DMS collaboration features

3. **Signature Workflow in DMS**
   - Integrate signature workflow dialog
   - Show signature status in document view
   - Handle signature routing

### Phase 2: PDF Generation & Completion

1. **PDF as Document Version**
   - When form is completed, generate PDF
   - Create new `DocumentVersion` with PDF file
   - Mark document as "completed"

2. **Correspondence Integration**
   - Add "Attach from DMS" option in correspondence
   - Link completed form PDFs to correspondence
   - PDFs are routed through correspondence workflow

### Phase 3: Migration & Cleanup

1. **Data Migration**
   - Migrate existing `FormSubmission` to DMS `Document` + `FormDocument`
   - Preserve all form data and signatures
   - Link to existing correspondence if applicable

2. **UI Updates**
   - Remove forms from correspondence registration page
   - Add forms section to DMS page
   - Update navigation/sidebar

3. **API Cleanup**
   - Deprecate old forms endpoints (or keep for backward compatibility)
   - Update frontend to use DMS APIs

## Benefits

1. **Better Architecture**
   - Clear separation: DMS = creation, Correspondence = routing
   - Forms are documents, so they belong in DMS

2. **Enhanced Collaboration**
   - Use existing DMS collaboration features
   - Comments, discussions, version history
   - Multi-user editing

3. **Unified Experience**
   - All documents (letters, memos, forms) in one place
   - Consistent UI/UX
   - Better search and organization

4. **Flexible Workflow**
   - Forms can be worked on independently
   - Once complete, attach to correspondence
   - Supports both standalone forms and correspondence-linked forms

## Migration Strategy

### Option A: Gradual Migration
1. Add forms to DMS while keeping old system
2. Allow users to choose where to create forms
3. Migrate data gradually
4. Deprecate old system after migration complete

### Option B: Direct Migration
1. Build new system in DMS
2. Migrate all data at once
3. Switch over completely
4. Remove old system

**Recommendation**: Option A (Gradual) for less disruption

## Next Steps

1. ✅ Review and approve plan
2. Add FORM document type to DMS
3. Create FormDocument model
4. Build form creation UI in DMS
5. Integrate form filling into DMS document view
6. Add signature workflow to DMS
7. Implement PDF generation as DocumentVersion
8. Add correspondence linking
9. Migrate existing data
10. Update UI and remove old forms from correspondence

