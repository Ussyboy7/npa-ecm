# Help & Guide Section Review

## Overview
The Help & Guide section provides onboarding resources, FAQs, workspace highlights, and support contacts. This review identifies issues and areas for improvement.

## Issues Identified

### 1. **Security: XSS Risk with `dangerouslySetInnerHTML`**
**Location**: `frontend/app/help/page.tsx:400`
**Issue**: Help guide content is rendered using `dangerouslySetInnerHTML` without sanitization, creating an XSS vulnerability if malicious content is stored in the database.
**Risk**: High - Admin users could inject malicious scripts
**Recommendation**: 
- Use a sanitization library like `DOMPurify` or `sanitize-html`
- Or implement server-side sanitization before storing content
- Consider using a markdown renderer with sanitization

### 2. **Hardcoded Email Addresses**
**Location**: `frontend/app/help/page.tsx:169, 181, 193`
**Issue**: Email addresses are hardcoded instead of using the branding constant `NPA_ECM_CONTACT_EMAIL`.
**Impact**: Inconsistency and maintenance burden
**Recommendation**: 
- Use `NPA_ECM_CONTACT_EMAIL` for the programme office email
- Add new constants for support and feedback emails if they differ
- Or create a centralized support contacts configuration

### 3. **Category Display Names**
**Location**: `frontend/app/help/page.tsx:388`
**Issue**: Category names are displayed by replacing dashes with spaces (`category.replace(/-/g, " ")`), which doesn't match the proper display names from the model choices.
**Current**: "dms" → "dms", "correspondence" → "correspondence"
**Expected**: Should show "Document Management", "Correspondence", "Workflow", "Administration"
**Recommendation**: Create a mapping function to convert category keys to display names:
```typescript
const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    dms: "Document Management",
    correspondence: "Correspondence",
    workflow: "Workflow",
    admin: "Administration",
  };
  return categoryMap[category] || category;
};
```

### 4. **Limited Error Handling**
**Location**: `frontend/app/help/page.tsx:253-258`
**Issue**: Errors are caught but only displayed as a generic message in the empty state. No user-friendly error messages or retry mechanisms.
**Recommendation**:
- Add a toast notification for errors
- Provide a retry button
- Show more specific error messages when possible
- Log errors to the client logger

### 5. **Empty State Could Be More Helpful**
**Location**: `frontend/app/help/page.tsx:377-382`
**Issue**: When no guides are published, shows a generic message. Could provide actionable next steps.
**Recommendation**:
- Add a link to contact the programme office
- Suggest checking back later
- Provide a way to request specific guides

### 6. **FAQ Item Key Issue**
**Location**: `frontend/app/help/page.tsx:429`
**Issue**: Using `item.question` as the key and value for AccordionItem, which could cause issues if questions are duplicated or very long.
**Recommendation**: Use `item.id` if available, or generate a stable key from the question hash.

### 7. **Missing Loading State for Individual Sections**
**Location**: `frontend/app/help/page.tsx:361-376`
**Issue**: Only the guides section shows loading state. FAQs load asynchronously but don't show a loading indicator.
**Recommendation**: Add loading states for FAQs section as well.

### 8. **API Endpoint Verification**
**Location**: `frontend/app/help/page.tsx:245-246`
**Issue**: Endpoints use `/support/guides/` and `/support/faqs/` - need to verify these match the backend router configuration.
**Status**: ✅ Verified - Backend router registers `guides` and `faqs` under support namespace, so paths are correct.

### 9. **Accessibility Improvements**
**Issues**:
- Missing ARIA labels on some interactive elements
- Accordion items could benefit from better keyboard navigation hints
- Help guide cards could have better focus indicators
**Recommendation**: Add proper ARIA labels and ensure keyboard navigation works smoothly.

### 10. **Content Sanitization on Backend**
**Location**: `backend/support/models.py:26`
**Issue**: Help guide content is stored as plain text without any validation or sanitization.
**Recommendation**: 
- Add a model method to sanitize content before saving
- Or use a markdown field with validation
- Consider using Django's `bleach` library for HTML sanitization

## Positive Aspects

✅ **Good Structure**: The page is well-organized with clear sections
✅ **Responsive Design**: Uses proper grid layouts for different screen sizes
✅ **Fallback Content**: Has default FAQ items when backend data isn't available
✅ **Contextual Help**: HelpGuideCard and ContextualHelp components are used throughout the app
✅ **Support Resources**: Clear contact information for different types of support needs

## Recommendations Summary

### High Priority
1. **Fix XSS vulnerability** - Implement content sanitization
2. **Use branding constants** - Replace hardcoded emails
3. **Fix category display names** - Use proper display names from model

### Medium Priority
4. **Improve error handling** - Add retry mechanisms and better messages
5. **Enhance empty states** - Provide actionable guidance
6. **Add loading states** - Show loading for FAQs section

### Low Priority
7. **Improve accessibility** - Add ARIA labels and keyboard navigation hints
8. **Backend sanitization** - Add content validation on save
9. **FAQ key optimization** - Use stable keys for accordion items

## Implementation Notes

- The Help & Guide components (`HelpGuideCard`, `ContextualHelp`) are well-designed and reusable
- The backend API structure is solid with proper filtering and search capabilities
- Consider adding analytics to track which guides/FAQs are most viewed
- Could benefit from a search functionality for guides and FAQs

