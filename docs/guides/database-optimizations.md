# Backend & Database Hit Optimizations

## Summary
Fixed multiple issues causing excessive backend API calls and database queries.

## Issues Fixed

### 1. **forEach with async in Correspondence Detail Page** ✅
**File**: `app/correspondence/[id]/page.tsx` (line 392)

**Problem**: 
- Using `forEach` with async functions fires all API calls simultaneously without waiting
- No tracking of which minutes have been marked, causing duplicate calls
- Effect runs every time `minutes` array changes, triggering multiple API calls

**Solution**:
- Replaced `forEach` with `Promise.allSettled` for proper async handling
- Added `markedAsOpenedRef` to track processed minutes and prevent duplicates
- Removed `minutes` from dependency array to prevent re-runs on every change
- Only depends on `correspondence?.id`, `activeUser?.id`, and related IDs

**Impact**: Prevents duplicate API calls when minutes array updates

---

### 2. **Unbounded API Calls in DMS Detail Page** ✅
**File**: `app/dms/[id]/page.tsx` (line 386)

**Problem**:
- `Promise.all` with `links.map` fires all API calls simultaneously
- If document has 20+ linked correspondences, that's 40+ simultaneous API calls (2 per link)
- Can overwhelm backend and cause timeouts

**Solution**:
- Implemented batching: process links in batches of 5
- Each batch waits for completion before starting next batch
- Limits concurrent API calls to 10 (5 links × 2 calls each)

**Impact**: Reduces server load and prevents timeouts for documents with many links

---

### 3. **OrganizationContext Infinite Loop** ✅
**File**: `contexts/OrganizationContext.tsx` (line 610)

**Problem**:
- `useEffect` sets `hasSynced` to `false` whenever `currentUser?.id` changes
- This triggers another `useEffect` that calls `refreshOrganizationData`
- Can cause unnecessary re-fetches even when user hasn't actually changed

**Solution**:
- Added `lastUserIdRef` to track the last synced user ID
- Only reset `hasSynced` if user ID actually changed
- Prevents duplicate fetches for the same user

**Impact**: Prevents unnecessary organization data fetches

---

### 4. **CorrespondenceContext Duplicate Syncs** ✅
**File**: `contexts/CorrespondenceContext.tsx` (line 418)

**Problem**:
- `useEffect` depends on `syncFromApi` which is recreated on every render
- Can cause multiple syncs even when user hasn't changed
- No tracking of which user has been synced

**Solution**:
- Added `syncedUserIdRef` to track synced user ID
- Only sync if user ID changed or hasn't synced yet
- Changed dependencies to `currentUser?.id` instead of full `currentUser` object

**Impact**: Prevents duplicate correspondence syncs

---

## Additional Optimizations Already in Place

### ✅ Singleton Patterns
- `useCurrentUser`: Global singleton prevents multiple user fetches
- `useSidebarCounts`: Global polling singleton with 30s cache
- `useNotificationWebSocket`: Single WebSocket connection shared across components

### ✅ Caching
- Sidebar counts: 30-second cache TTL
- Organization data: 5-minute cache
- Template storage: Backend-based with localStorage fallback

### ✅ Debouncing
- Search inputs: 300ms debounce in `SimplifiedRoleSwitcher`
- Document search: Debounced in `TreatmentModal`
- Advanced search: 300ms debounce

### ✅ Request Cancellation
- AbortController used in most API calls
- Previous requests cancelled when new ones start
- Prevents race conditions and unnecessary responses

### ✅ Pagination
- Correspondence: 25 items per page
- Minutes: 100 items per page
- Documents: Configurable page sizes
- Organization users: Paginated with deduplication

---

## Recommendations for Further Optimization

1. **Batch API Endpoints**: Consider creating batch endpoints for:
   - Marking multiple minutes as opened
   - Fetching multiple correspondence details at once
   - Loading related data in single requests

2. **GraphQL or REST Batching**: For complex pages like DMS detail, consider:
   - GraphQL queries to fetch related data in one request
   - REST batch endpoints for multiple resources

3. **Server-Side Caching**: Backend should implement:
   - Redis caching for frequently accessed data
   - Query result caching for expensive operations
   - Response caching headers

4. **Database Query Optimization**: Backend should:
   - Use `select_related` and `prefetch_related` in Django ORM
   - Add database indexes for frequently queried fields
   - Implement query result pagination at database level

5. **API Rate Limiting**: Consider implementing:
   - Client-side rate limiting for rapid user actions
   - Backend rate limiting to prevent abuse
   - Request queuing for non-critical operations

---

## Testing Recommendations

1. **Monitor Network Tab**: Check for duplicate API calls in browser DevTools
2. **Backend Logs**: Monitor for excessive database queries
3. **Performance Metrics**: Track API response times and error rates
4. **Load Testing**: Test with documents that have many linked correspondences

---

## Files Modified

1. `app/correspondence/[id]/page.tsx` - Fixed forEach async issue
2. `app/dms/[id]/page.tsx` - Added batching for correspondence links
3. `contexts/OrganizationContext.tsx` - Fixed infinite loop
4. `contexts/CorrespondenceContext.tsx` - Prevented duplicate syncs

---

## Verification

- ✅ No linter errors
- ✅ All TypeScript errors resolved
- ✅ Proper async/await patterns
- ✅ Request cancellation implemented
- ✅ Dependency arrays optimized

