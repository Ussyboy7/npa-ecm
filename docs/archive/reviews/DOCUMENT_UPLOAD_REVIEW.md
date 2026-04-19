# Document Upload Dialog Review

## Overview
The `DocumentUploadDialog` component handles both creating new documents and uploading new versions. It supports two content modes: file upload and rich text composition with templates.

## Strengths

1. **Dual Mode Support**: Supports both file upload and rich text composition
2. **Template System**: Integration with document templates for quick document creation
3. **Comprehensive Metadata**: Captures title, type, status, sensitivity, division, department, reference, tags, description
4. **File Size Validation**: Client-side validation for file size (10MB limit)
5. **Template Tokens**: Dynamic token replacement system for personalized templates
6. **Version Notes**: Allows adding context about uploads
7. **Responsive Design**: Uses ScrollArea for long forms

## Critical Issues

### 1. **Missing File Type Validation** (Security Risk)
**Location**: Line 195-208 (`handleFileChange`)
**Issue**: Only checks file size, not file type/MIME type. Malicious files could be uploaded.
**Impact**: Security vulnerability - could allow executable files, scripts, etc.
**Recommendation**: 
```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/html',
];

const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const selected = event.target.files?.[0];
  if (!selected) {
    setFile(null);
    return;
  }

  if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
    return;
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(selected.type)) {
    toast.error(`File type "${selected.type}" is not allowed. Please upload PDF, Word, Excel, PowerPoint, or Text files.`);
    return;
  }

  // Additional validation: check file extension as backup
  const extension = selected.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'html'];
  if (!extension || !allowedExtensions.includes(extension)) {
    toast.error(`File extension ".${extension}" is not allowed.`);
    return;
  }

  setFile(selected);
};
```

### 2. **No Server-Side Validation Feedback**
**Location**: Line 334-343 (error handling)
**Issue**: Generic error messages don't provide specific validation feedback from backend
**Impact**: Poor UX - users don't know what went wrong
**Recommendation**: Parse backend validation errors and display field-specific messages

### 3. **Missing Required Field Indicators**
**Location**: Line 425-431 (Title field)
**Issue**: Only title shows `*` indicator, but other required fields (file/content) don't
**Impact**: Confusing UX
**Recommendation**: Add visual indicators for all required fields

### 4. **No Drag-and-Drop Support**
**Location**: File upload section (Line 670-683)
**Issue**: Only supports click-to-upload, no drag-and-drop
**Impact**: Less modern UX, slower workflow
**Recommendation**: Add drag-and-drop zone with visual feedback

### 5. **Missing File Preview**
**Location**: File upload section
**Issue**: No preview of selected file before upload
**Impact**: Users can't verify they selected the correct file
**Recommendation**: Show file name, size, type, and preview (if image/PDF)

### 6. **No Progress Indicator for Large Files**
**Location**: `handleSubmit` function
**Issue**: No upload progress for large files
**Impact**: Users don't know if upload is progressing
**Recommendation**: Implement progress tracking with `XMLHttpRequest` or fetch with progress events

### 7. **Template Application Confirmation Uses `window.confirm`**
**Location**: Line 596, 735
**Issue**: Uses browser's native confirm dialog (poor UX, not accessible)
**Impact**: Inconsistent UI, poor accessibility
**Recommendation**: Use custom AlertDialog component

### 8. **No Workspace Assignment**
**Location**: Metadata section
**Issue**: Can't assign document to workspaces during creation
**Impact**: Users must edit document after creation to add to workspaces
**Recommendation**: Add workspace multi-select in metadata section

## Medium Priority Issues

### 9. **Missing Input Validation**
**Location**: Various input fields
**Issues**:
- Title: No max length validation (backend allows 500 chars)
- Reference Number: No format validation
- Tags: No duplicate detection
- Description: No max length indication
**Recommendation**: Add client-side validation with helpful error messages

### 10. **No Auto-Save/Draft Functionality**
**Location**: Component state
**Issue**: If user closes dialog accidentally, all input is lost
**Impact**: Poor UX, data loss
**Recommendation**: Auto-save form state to localStorage, restore on reopen

### 11. **Sensitivity Warning Not Shown**
**Location**: Line 462-478 (Sensitivity select)
**Issue**: Warning text exists but no visual warning when selecting restricted/confidential
**Impact**: Users might not understand access implications
**Recommendation**: Show Alert component when restricted/confidential is selected (similar to detail page)

### 12. **Template Preview Doesn't Show Tokens Replaced**
**Location**: Line 711-749 (Template preview dialog)
**Issue**: Preview shows raw template HTML, not with tokens replaced
**Impact**: Users can't see how template will look with actual data
**Recommendation**: Replace tokens in preview with sample data

### 13. **No Batch Upload Support**
**Location**: File upload section
**Issue**: Can only upload one file at a time
**Impact**: Inefficient for bulk document creation
**Recommendation**: Add multi-file selection with individual metadata per file

### 14. **Missing Accessibility Attributes**
**Location**: Throughout component
**Issues**:
- File input lacks `aria-label`
- Required fields lack `aria-required`
- Error messages lack `role="alert"`
- Form lacks `aria-describedby` for help text
**Recommendation**: Add comprehensive ARIA attributes

### 15. **No Keyboard Shortcuts**
**Location**: Dialog
**Issue**: No keyboard shortcuts for common actions (Ctrl+S to save, Esc to close)
**Impact**: Slower workflow for power users
**Recommendation**: Add keyboard event handlers

## Low Priority / Enhancement Opportunities

### 16. **File Type Icons**
**Location**: File upload section
**Recommendation**: Show file type icon next to selected file name

### 17. **Recent Files/Quick Access**
**Location**: File upload section
**Recommendation**: Show recently uploaded files for quick re-upload

### 18. **Template Search/Filter**
**Location**: Template selector (Line 573-584)
**Recommendation**: Add search/filter for templates when list is long

### 19. **Template Categories**
**Location**: Template system
**Recommendation**: Group templates by category (Letter, Memo, Circular, etc.)

### 20. **Rich Text Editor Character Count**
**Location**: RichTextEditor (Line 655-665)
**Issue**: Shows maxCharacters but not current count
**Recommendation**: Display current/max character count

### 21. **Version Number Preview**
**Location**: Version upload mode
**Recommendation**: Show what version number will be assigned

### 22. **Duplicate Detection**
**Location**: Title/Reference Number fields
**Recommendation**: Check for existing documents with same title/reference and warn user

### 23. **Bulk Tag Suggestions**
**Location**: Tags input (Line 541-549)
**Recommendation**: Autocomplete/suggestions based on existing tags

### 24. **Division/Department Auto-Fill**
**Location**: Division/Department selects
**Recommendation**: Pre-fill based on user's division/department, but allow override

### 25. **Upload History**
**Location**: Dialog footer
**Recommendation**: Show recent uploads for reference

## Code Quality Issues

### 26. **Type Safety**
**Location**: Line 105 (`editorJson: any`)
**Issue**: Uses `any` type, loses type safety
**Recommendation**: Define proper type for editor JSON structure

### 27. **Error Handling**
**Location**: Line 334-343
**Issue**: Generic error handling, doesn't differentiate between network errors, validation errors, etc.
**Recommendation**: Implement structured error handling with specific error types

### 28. **State Management**
**Location**: Multiple useState hooks
**Issue**: Many related state variables could be grouped
**Recommendation**: Consider using `useReducer` for complex form state

### 29. **Magic Numbers**
**Location**: Line 43 (`MAX_FILE_SIZE_MB = 10`)
**Issue**: Hardcoded constant
**Recommendation**: Move to config file or fetch from backend

### 30. **Missing Loading States**
**Location**: Template operations (apply, preview, save)
**Issue**: No loading indicators for async template operations
**Recommendation**: Add loading states for better UXpl

## Security Considerations

1. **File Upload Validation**: Must validate on both client and server
2. **XSS Prevention**: Ensure RichTextEditor sanitizes HTML output
3. **CSRF Protection**: Ensure upload endpoints are protected
4. **Rate Limiting**: Backend should implement rate limiting for uploads
5. **File Scanning**: Backend should scan uploaded files for malware

## Performance Considerations

1. **Large File Handling**: Consider chunked uploads for files > 5MB
2. **Template Loading**: Lazy load templates, don't load all at once
3. **Image Optimization**: If supporting images, compress before upload
4. **Debounce Validation**: Debounce validation checks to avoid excessive API calls

## Testing Recommendations

1. **Unit Tests**: Test validation logic, file type checking, size limits
2. **Integration Tests**: Test full upload flow with mock backend
3. **E2E Tests**: Test user workflow from dialog open to document creation
4. **Accessibility Tests**: Test with screen readers, keyboard navigation
5. **Error Scenarios**: Test network failures, validation errors, large files

## Summary

**Critical Issues**: 8
**Medium Priority**: 7
**Low Priority/Enhancements**: 9
**Code Quality**: 5

**Priority Actions**:
1. Add file type validation (Security)
2. Replace `window.confirm` with AlertDialog (UX/Accessibility)
3. Add drag-and-drop support (UX)
4. Add file preview (UX)
5. Add workspace assignment (Feature)
6. Improve error handling and validation feedback (UX)
7. Add accessibility attributes (A11y)
8. Add upload progress indicator (UX)

