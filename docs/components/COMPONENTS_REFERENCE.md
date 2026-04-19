# NPA ECM Component Documentation

This document provides detailed documentation for the frontend components in the NPA Electronic Content Management System.

## Table of Contents

- [CompletionSummaryModal](#completionsummarymodal)
- [ActionsPanel](#actionspanel)
- [DocumentUploadDialog](#documentuploaddialog)

---

## CompletionSummaryModal

A comprehensive modal component that displays the completion summary for correspondence items, including final actions, document content, and process statistics.

### Location
`frontend/components/correspondence/CompletionSummaryModal.tsx`

### Props

```typescript
interface CompletionSummaryModalProps {
  open?: boolean;                    // Controls modal visibility
  onOpenChange?: (open: boolean) => void; // Callback when modal state changes
  correspondence?: Correspondence;   // Correspondence object data
  minutes?: Minute[];               // Array of minute objects
  documentContentHtml?: string;     // HTML content of the final document
}
```

### Features

- **Correspondence Overview**: Displays reference number, status, subject, and completion date
- **Final Action Details**: Shows the last action taken, timestamp, and responsible user
- **Document Preview**: Renders the final document content in a scrollable container
- **Process Statistics**: Shows total minutes count and completion metrics

### Usage Example

```typescript
import { CompletionSummaryModal } from '@/components/correspondence/CompletionSummaryModal';

function CorrespondenceView({ correspondence, minutes }) {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <>
      <Button onClick={() => setShowSummary(true)}>
        View Completion Summary
      </Button>

      <CompletionSummaryModal
        open={showSummary}
        onOpenChange={setShowSummary}
        correspondence={correspondence}
        minutes={minutes}
        documentContentHtml={documentContent}
      />
    </>
  );
}
```

### Dependencies

- `Dialog` components from `@/components/ui/dialog`
- `Badge` component from `@/components/ui/badge`
- `Card` components from `@/components/ui/card`
- `formatDateTime` utility from `@/lib/correspondence-helpers`

---

## ActionsPanel

A dynamic actions panel component that provides context-aware actions for correspondence management based on the current state and user permissions.

### Location
`frontend/app/correspondence/[id]/components/ActionsPanel.tsx`

### Props

```typescript
interface ActionsPanelProps {
  correspondence?: Correspondence;
  minutes?: Minute[];
  activeUser?: any;
  isCompleted?: boolean;
  isCurrentUserTurn?: boolean;
  isForInformationOnly?: boolean;
  isExecutive?: boolean;
  turnRestrictedDisabled?: boolean;
  completionPackageUrl?: string | null;
  completionGeneratedAt?: string | null;
  activeDelegation?: any;
  onOpenMinuteModal?: () => void;
  onOpenTreatmentModal?: () => void;
  onOpenCompletionModal?: () => void;
  onOpenDelegateModal?: () => void;
  onDownloadCompletionPackage?: (url: string, filename: string) => Promise<void>;
  onSyncFromApi?: () => Promise<any>;
}
```

### Features

- **Status Display**: Shows current correspondence status with appropriate badges
- **Primary Actions**: Add minutes, process correspondence, complete items (context-aware)
- **Delegation Support**: Delegate correspondence to other users
- **Completion Package**: Download final completion packages for completed items
- **Activity Statistics**: Shows minute counts and last activity timestamps
- **Sync Functionality**: Refresh data from the API

### Action States

The panel adapts its actions based on:

- **User Permissions**: Shows appropriate actions based on user role and permissions
- **Correspondence State**: Different actions for active vs completed correspondence
- **User Turn**: Only shows relevant actions when it's the user's turn
- **Delegation Status**: Shows delegation information when applicable

### Usage Example

```typescript
import { ActionsPanel } from './ActionsPanel';

function CorrespondenceDetail({ correspondence, minutes, activeUser }) {
  return (
    <ActionsPanel
      correspondence={correspondence}
      minutes={minutes}
      activeUser={activeUser}
      isCompleted={correspondence.status === 'completed'}
      isCurrentUserTurn={isCurrentUserTurn}
      onOpenMinuteModal={() => setShowMinuteModal(true)}
      onOpenTreatmentModal={() => setShowTreatmentModal(true)}
      onDownloadCompletionPackage={handleDownload}
      onSyncFromApi={handleSync}
    />
  );
}
```

### Dependencies

- UI components from `@/components/ui/*`
- `cn` utility from `@/lib/utils`
- `formatDateTime` from `@/lib/correspondence-helpers`

---

## DocumentUploadDialog

An advanced document upload dialog that supports multiple upload modes with comprehensive file validation, progress tracking, and error handling.

### Location
`frontend/components/dms/DocumentUploadDialog.tsx`

### Props

```typescript
interface DocumentUploadDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "document" | "version" | "create";  // Upload mode
  currentUser?: any;                        // Current user object
  document?: DocumentRecord;                // Document for version uploads
  onComplete?: (document: DocumentRecord) => void; // Success callback
  onCancel?: () => void;                    // Cancel callback
  asPage?: boolean;                         // Render as full page instead of modal
}
```

### Features

- **Multiple Upload Modes**:
  - `document`: Upload new documents
  - `version`: Upload new versions of existing documents
  - `create`: Create new documents (alias for document mode)

- **File Validation**:
  - Supported formats: PDF, Word, Excel, PowerPoint, Text, CSV, Images
  - Size limit: 50MB maximum
  - Type checking and user-friendly error messages

- **Upload Progress**: Real-time progress tracking during upload
- **Metadata Collection**: Title, description, and document type selection
- **Drag & Drop**: Intuitive file selection with drag-and-drop support
- **Error Handling**: Comprehensive error states with retry options

### Supported File Types

```typescript
const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
];
```

### Usage Examples

#### Modal Mode (Default)
```typescript
import { DocumentUploadDialog } from '@/components/dms/DocumentUploadDialog';

function DocumentManager() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <DocumentUploadDialog
      open={showUpload}
      onOpenChange={setShowUpload}
      mode="document"
      currentUser={currentUser}
      onComplete={(doc) => {
        console.log('Document uploaded:', doc);
        setShowUpload(false);
      }}
    />
  );
}
```

#### Version Upload
```typescript
<DocumentUploadDialog
  open={showVersionUpload}
  onOpenChange={setShowVersionUpload}
  mode="version"
  document={selectedDocument}
  currentUser={currentUser}
  onComplete={handleVersionComplete}
/>
```

#### Page Mode
```typescript
<DocumentUploadDialog
  asPage={true}
  mode="create"
  currentUser={currentUser}
  onComplete={handleComplete}
/>
```

### Error Handling

The component provides comprehensive error handling for:

- Invalid file types
- File size exceeded
- Network errors during upload
- API validation errors
- Authentication issues

### Dependencies

- Dialog components from `@/components/ui/dialog`
- Form components from `@/components/ui/*`
- `apiFetch` from `@/lib/api-client`
- File validation utilities

---

## Common Patterns

### Modal State Management

```typescript
const [modalState, setModalState] = useState({
  completionSummary: false,
  uploadDialog: false,
  // ... other modals
});

const openModal = (modalName: string) => {
  setModalState(prev => ({ ...prev, [modalName]: true }));
};

const closeModal = (modalName: string) => {
  setModalState(prev => ({ ...prev, [modalName]: false }));
};
```

### Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await performAction();
  } finally {
    setLoading(false);
  }
};
```

### Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

<ErrorBoundary>
  <ActionsPanel {...props} />
</ErrorBoundary>
```

---

## Accessibility

All components follow accessibility best practices:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management in modals
- Color contrast compliance

---

## Testing

Components include comprehensive error boundaries and validation:

- Type-safe prop interfaces
- Runtime prop validation
- Error boundary fallbacks
- Loading state handling
- Network error recovery