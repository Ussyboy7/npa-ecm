# Unused Imports & Pages Review

## Summary
Critical review of unused imports, components, and pages across the npa-ecm frontend.

## Issues Fixed

### 1. **Missing Import in `app/approvals/page.tsx`** ✅
**Issue**: `format` function from `date-fns` was used but not imported (line 290)
**Fix**: Added `import { format } from 'date-fns';`
**Impact**: Build/runtime error prevented

### 2. **Unused Import in `app/approvals/page.tsx`** ✅
**Issue**: `Link` component from `next/link` was imported but never used
**Fix**: Removed unused import
**Impact**: Cleaner code, reduced bundle size

### 3. **Unused Component: `GlobalSearchBar`** ✅
**File**: `components/search/GlobalSearchBar.tsx`
**Issue**: Component was never imported or used anywhere in the codebase
**Fix**: Deleted the component file
**Impact**: Reduced codebase size, removed dead code

## Pages Status

### Redirect Pages (Keep for Backward Compatibility)
1. **`app/dms/page.tsx`** - Redirects to `/documents`
   - Status: ✅ Keep (may be linked from external sources or bookmarks)
   - Purpose: Legacy route support

2. **`app/tasks/page.tsx`** - Redirects to `/inbox`
   - Status: ✅ Keep (may be linked from external sources or bookmarks)
   - Purpose: Legacy route support

## Recommendations

### 1. **Regular Cleanup**
- Run periodic checks for unused imports using TypeScript compiler
- Use ESLint rules: `@typescript-eslint/no-unused-vars` and `no-unused-imports`
- Consider adding pre-commit hooks to catch unused imports

### 2. **Component Audit**
- Review all components in `/components` directory for usage
- Remove components that are no longer referenced
- Document components that are kept for future use

### 3. **Import Organization**
- Consider using import sorting tools (e.g., `eslint-plugin-import`)
- Group imports: external → internal → relative
- Remove unused imports during code reviews

## Files Modified

1. `app/approvals/page.tsx`
   - Added: `import { format } from 'date-fns';`
   - Removed: `import Link from 'next/link';`

2. `components/search/GlobalSearchBar.tsx`
   - Deleted: Entire file (unused component)

## Verification

- ✅ No linter errors
- ✅ All imports are now used
- ✅ Missing imports added
- ✅ Unused components removed

## Next Steps

1. Consider running a full TypeScript unused variable check:
   ```bash
   npx tsc --noUnusedLocals --noUnusedParameters
   ```

2. Add ESLint rules to prevent unused imports:
   ```json
   {
     "rules": {
       "@typescript-eslint/no-unused-vars": "error",
       "no-unused-imports/no-unused-imports": "error"
     }
   }
   ```

3. Regular audits: Schedule monthly reviews for unused code

