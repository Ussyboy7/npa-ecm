# Comprehensive `any` Type Audit - FINAL RESULTS

## ✅ Accurate Count (Comprehensive Check)

**Total `any` types**: **463 instances**  
**Files affected**: **96 files**

---

## Breakdown by Pattern

| Pattern | Count | Examples |
|---------|-------|----------|
| `: any` (type annotations) | 278 | `(item: any)`, `catch (error: any)` |
| `any)` (function parameters) | 246 | Overlaps with `: any` |
| `any[]` (array types) | ~69 | `let items: any[]` |
| `<any>` (generic types) | ~75 | `apiFetch<any>`, `unwrapResults<any>` |
| `Record<string, any>` | 28 | `Record<string, any>` |
| `Promise<any>` | 3 | `Promise<any>` |
| `as any` (type assertions) | ~50 | `prefs as any` |
| `any;` (variable declarations) | 25 | `const data: any;` |
| `any =` (assignments) | 15 | `let x: any = ...` |

**Note**: Some patterns overlap (e.g., `(item: any)` matches both `: any` and `any)`)

---

## Top Files with Most `any` Types

1. **`lib/dms-storage.ts`** - 64 instances
2. **`lib/sla-client.ts`** - 31 instances
3. **`contexts/OrganizationContext.tsx`** - 17 instances
4. **`app/dms/[id]/page.tsx`** - 16 instances
5. **`components/search/AdvancedSearch.tsx`** - 13 instances
6. **`app/correspondence/outbox/[id]/page.tsx`** - 13 instances
7. **`lib/api/cases.ts`** - 12 instances
8. **`app/correspondence/office-outbox/page.tsx`** - 11 instances
9. **`app/correspondence/[id]/correspondence-state-reducer.ts`** - 10 instances
10. **`contexts/CorrespondenceContext.tsx`** - 9 instances

---

## Breakdown by File Type

- **TSX files**: 291 instances
- **TS files**: 172 instances

---

## Common Patterns

### 1. API Calls (75 instances)
```typescript
const response = await apiFetch<any>(`/endpoint/`);
```

### 2. Error Handling (97 instances)
```typescript
catch (error: any) { ... }
catch (err: any) { ... }
```

### 3. Mapping Functions (~100+ instances)
```typescript
const mapApiUser = (user: any): User => { ... }
unwrapResults<any>(response)
```

### 4. Type Assertions (~50 instances)
```typescript
prefs as any
(notFoundError as any).status = 404
```

### 5. Record Types (28 instances)
```typescript
Record<string, any>
```

---

## Verification Commands

```bash
# Comprehensive count
grep -rE "(:\s*any\b|as\s+any\b|<any>|any\[\]|Record<string,\s*any>|Promise<any>|Array<any>)" --include="*.ts" --include="*.tsx" frontend/ | grep -v node_modules | grep -v ".next" | wc -l
# Result: 463

# Files affected
find frontend -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" -exec grep -lE "(:\s*any\b|as\s+any\b|<any>|any\[\]|Record<string,\s*any>|Promise<any>|Array<any>)" {} \; | wc -l
# Result: 96
```

---

## Summary

| Metric | Previous Estimate | Actual | Difference |
|--------|------------------|--------|------------|
| Console statements | ~186 | **0** | ✅ Fixed |
| `any` types | ~435 | **463** | +28 more |
| Files with `any` | ~92 | **96** | +4 more |

---

## Next Steps

1. **High Priority**: Replace `apiFetch<any>` (75 instances)
2. **High Priority**: Replace `catch (error: any)` with `catch (error: unknown)` (97 instances)
3. **Medium Priority**: Create proper API response types for mapping functions
4. **Low Priority**: Replace `Record<string, any>` with proper types

