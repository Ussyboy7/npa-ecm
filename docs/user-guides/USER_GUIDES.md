# User Guides for NPA ECM Features

This section provides comprehensive user guides for using the new features and components in the NPA Electronic Content Management System.

## Table of Contents

- [Correspondence Completion Summary](#correspondence-completion-summary)
- [Correspondence Actions Panel](#correspondence-actions-panel)
- [Document Upload and Versioning](#document-upload-and-versioning)

---

## Correspondence Completion Summary

The Completion Summary modal provides a comprehensive overview of completed correspondence items, including final actions, document content, and process statistics.

### How to Access

1. Navigate to any correspondence item
2. Look for completed correspondence (status shows "Completed")
3. Click the "View Completion Summary" button or completion icon

### Features Overview

#### Correspondence Details
- **Reference Number**: Unique identifier for the correspondence
- **Status**: Current completion status with visual badge
- **Subject**: Brief description of the correspondence
- **Completion Date**: When the correspondence was finalized

#### Final Action Information
- **Action Type**: The final action taken (approved, completed, etc.)
- **Timestamp**: When the final action occurred
- **Processed By**: User who performed the final action
- **Content**: Any additional notes or content from the final action

#### Document Preview
- **Full Document Content**: Scrollable preview of the final document
- **HTML Rendering**: Properly formatted document display
- **Content Search**: Use browser find (Ctrl+F) to search within content

#### Process Statistics
- **Total Minutes**: Number of actions/minutes in the correspondence
- **Final Action**: Summary of the concluding action
- **Timeline**: Complete activity history

### Use Cases

#### For Managers
- Review completed correspondence before final approval
- Verify all required actions were completed
- Check document content for accuracy
- Audit the complete process timeline

#### For Staff
- Understand what was completed and how
- Reference final document content
- Track their contributions to the process
- Learn from completed workflows

#### For Auditors
- Review complete correspondence trails
- Verify compliance with procedures
- Check timestamps and user actions
- Validate document authenticity

### Tips

- **Printing**: Use browser print function (Ctrl+P) to create physical copies
- **Searching**: Use Ctrl+F to search within document content
- **Navigation**: Scroll through long documents or use page thumbnails if available
- **Sharing**: Copy reference numbers for sharing with colleagues

---

## Correspondence Actions Panel

The Actions Panel is your central hub for managing correspondence items, providing context-aware actions based on your permissions and the correspondence status.

### Understanding the Status Display

#### Status Indicators
- **🟢 Completed**: Correspondence is finalized and closed
- **🔵 Your Turn**: It's your turn to take action
- **🟡 Waiting**: Waiting for other users or processes
- **🔴 Overdue**: Action is past due date

#### Delegation Status
- Shows if correspondence is currently delegated to another user
- Displays delegatee name and delegation period
- Indicates if you're the delegate acting on behalf of someone else

### Available Actions

#### Primary Actions (When It's Your Turn)

##### Add Minute
- **Purpose**: Add notes, comments, or progress updates
- **When Available**: When it's your turn to act
- **Process**:
  1. Click "Add Minute" button
  2. Select action type (comment, forward, approve, etc.)
  3. Add your content/notes
  4. Choose next recipient if forwarding
  5. Submit the minute

##### Process Correspondence
- **Purpose**: Take substantive action on the correspondence
- **When Available**: For actionable correspondence (not just FYI)
- **Options**:
  - Approve and forward
  - Request more information
  - Return for revision
  - Complete/finalize

##### Complete Correspondence
- **Purpose**: Mark correspondence as fully completed
- **When Available**: For executive users with completion authority
- **Result**: Generates completion package and closes the item

#### Secondary Actions

##### Delegate
- **Purpose**: Temporarily assign to another user
- **Use Cases**:
  - When you're unavailable
  - When another user has specific expertise
  - For training purposes
- **Process**:
  1. Click "Delegate" button
  2. Select user from organization
  3. Set delegation period (optional)
  4. Add delegation reason
  5. Confirm delegation

##### Download Completion Package
- **Purpose**: Get the final compiled document package
- **When Available**: Only for completed correspondence
- **Contents**: All minutes, final document, and metadata

##### Sync from API
- **Purpose**: Refresh data from the server
- **Use Cases**: When you suspect data is out of sync
- **Result**: Updates local data with latest server state

### Action Permissions

#### Role-Based Actions
- **Staff**: Can add minutes and basic actions
- **Officer**: Can process and forward correspondence
- **Manager**: Can delegate and oversee processes
- **Executive**: Can complete correspondence and make final decisions

#### State-Based Availability
- **Active Correspondence**: Full action set available
- **Completed Correspondence**: Limited to viewing and downloading
- **Delegated**: Actions may be restricted based on delegation rules

### Best Practices

#### Efficient Workflow
1. **Check Status First**: Always review the current status before taking action
2. **Read Previous Minutes**: Understand the context before adding your input
3. **Use Appropriate Actions**: Choose the right action type for your contribution
4. **Add Clear Notes**: Provide context for your decisions and actions

#### Delegation Guidelines
- **Use Sparingly**: Only delegate when necessary
- **Set Clear Expectations**: Communicate with delegatees about requirements
- **Monitor Progress**: Check delegated items periodically
- **Resume When Ready**: Take back control when you return

#### Documentation
- **Complete Information**: Provide comprehensive details in minutes
- **Clear Decisions**: Explain the reasoning behind your actions
- **Future Reference**: Document decisions for future audits or reviews

---

## Document Upload and Versioning

The Document Upload system provides a comprehensive solution for managing documents with full version control and advanced upload capabilities.

### Upload Modes

#### New Document Upload
- **Purpose**: Add new documents to the system
- **Process**:
  1. Navigate to Documents section
  2. Click "Upload Document" or "New Document"
  3. Select file from your device
  4. Fill in metadata (title, description, type)
  5. Upload and confirm

#### Version Upload
- **Purpose**: Add new versions of existing documents
- **Process**:
  1. Open existing document
  2. Click "Upload New Version"
  3. Select updated file
  4. Optionally update description
  5. Upload version

### File Requirements

#### Supported Formats
- **Documents**: PDF, Word (.doc, .docx), Text (.txt)
- **Spreadsheets**: Excel (.xls, .xlsx), CSV
- **Presentations**: PowerPoint (.ppt, .pptx)
- **Images**: JPEG, PNG, GIF (for attachments)

#### Size Limits
- **Maximum Size**: 50MB per file
- **Recommended**: Keep under 10MB for better performance
- **Large Files**: May take longer to upload and process

### Upload Process

#### Step-by-Step Guide

1. **File Selection**
   - Click upload button or drag files to drop zone
   - Browse your computer files
   - Multiple selection supported where applicable

2. **File Validation**
   - Automatic format checking
   - Size limit verification
   - Security scanning (if enabled)

3. **Metadata Entry**
   - **Title**: Required, descriptive name
   - **Description**: Optional, additional context
   - **Type**: Document category (letter, memo, policy, etc.)

4. **Upload Progress**
   - Real-time progress bar
   - Upload speed and time remaining
   - Pause/cancel options for large files

5. **Processing**
   - Server-side processing
   - Thumbnail generation
   - Text extraction (for search)
   - Version history update

6. **Confirmation**
   - Success notification
   - Document details display
   - Quick actions (view, share, download)

### Error Handling

#### Common Issues and Solutions

##### File Type Not Supported
- **Error**: "File type not supported"
- **Solution**: Convert to supported format (PDF, Word, etc.)
- **Prevention**: Check file extensions before upload

##### File Too Large
- **Error**: "File size exceeds limit"
- **Solution**: Compress file or split into smaller parts
- **Prevention**: Check file size before upload

##### Upload Interrupted
- **Error**: "Upload failed" or "Connection lost"
- **Solution**: Retry upload or check network connection
- **Recovery**: Resume interrupted uploads where possible

##### Permission Denied
- **Error**: "Insufficient permissions"
- **Solution**: Request appropriate permissions from administrator
- **Prevention**: Verify your access level before uploading

### Version Management

#### Version History
- **View All Versions**: Access complete version timeline
- **Compare Versions**: Side-by-side version comparison
- **Download Specific Versions**: Get any previous version
- **Version Metadata**: Creation date, uploader, change notes

#### Version Naming
- **Automatic**: Versions numbered sequentially (v1, v2, v3...)
- **Manual Notes**: Add descriptions for version changes
- **Change Tracking**: See what changed between versions

### Best Practices

#### File Organization
- **Descriptive Names**: Use clear, descriptive file names
- **Consistent Types**: Choose appropriate document types
- **Metadata**: Always fill in title and description
- **Tags**: Use tags for better searchability

#### Version Control
- **Frequent Saves**: Save versions regularly for important changes
- **Clear Descriptions**: Document what changed in each version
- **Major vs Minor**: Use descriptions to indicate significance
- **Clean Up**: Archive old versions when no longer needed

#### Security Considerations
- **File Scanning**: System automatically scans for malware
- **Access Control**: Respect document permissions
- **Confidentiality**: Mark sensitive documents appropriately
- **Audit Trail**: All uploads are logged for compliance

### Advanced Features

#### Bulk Upload
- Upload multiple files simultaneously
- Batch metadata assignment
- Progress tracking for all files
- Error handling per file

#### Drag and Drop
- Intuitive file selection
- Visual feedback during drag
- Drop zone highlighting
- Multi-file support

#### Progress Tracking
- Real-time upload progress
- Estimated time remaining
- Pause/resume capability
- Detailed error reporting

### Troubleshooting

#### Upload Stuck
1. Check internet connection
2. Try refreshing the page
3. Clear browser cache
4. Try a different browser

#### File Not Opening
1. Verify file format compatibility
2. Check file corruption
3. Try downloading again
4. Contact support for damaged files

#### Permission Issues
1. Verify your user role
2. Check document access permissions
3. Request additional permissions if needed
4. Contact administrator for access issues

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open upload dialog | Ctrl+U |
| Select all files | Ctrl+A |
| Cancel upload | Esc |
| Confirm upload | Enter |
| Focus search | Ctrl+F |

## Support

For technical issues or questions about document upload features, contact the NPA ECM support team or consult the system administrator.