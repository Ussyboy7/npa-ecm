# Correspondence Detail Page Refactoring Plan

## Current State
- **File:** `frontend/app/correspondence/[id]/page.tsx`
- **Lines:** ~2,650
- **Target:** <500 lines per file

## Components to Extract

### 1. ✅ CorrespondenceHeader (~150 lines)
- **Status:** Created
- **Location:** `components/CorrespondenceHeader.tsx`
- **Contains:** Reference number, priority, subject, action buttons, download menu

### 2. DocumentPreviewPanel (~500 lines)
- **Status:** To be created
- **Location:** `components/DocumentPreviewPanel.tsx`
- **Contains:** 
  - Document metadata card (sender, date, distribution)
  - Document preview area (PDF, Word, images)
  - Attachment list
  - Linked documents section

### 3. MinuteThreadPanel (~300 lines)
- **Status:** To be created
- **Location:** `components/MinuteThreadPanel.tsx`
- **Contains:**
  - Minute cards
  - Minute actions (edit, recall, add note)
  - Parallel routing indicators

### 4. ActionsPanel (~400 lines)
- **Status:** To be created
- **Location:** `components/ActionsPanel.tsx`
- **Contains:**
  - Current status card
  - Workflow progress
  - Action buttons (Minute, Treat, Complete, Delegate, etc.)
  - Delegation info

### 5. LinkedDocuments (~150 lines)
- **Status:** To be created
- **Location:** `components/LinkedDocuments.tsx`
- **Contains:**
  - Linked DMS documents list
  - Version selection
  - Unlink functionality

## Expected Results
- **Main page:** ~800-1000 lines (reduced from 2,650)
- **Total components:** 5 new components
- **Maintainability:** Significantly improved
- **Reusability:** Components can be reused in other detail pages

## Implementation Order
1. ✅ Create CorrespondenceHeader
2. Create DocumentPreviewPanel (largest section)
3. Create MinuteThreadPanel
4. Create ActionsPanel
5. Create LinkedDocuments
6. Update main page to use all components
7. Test and verify functionality

