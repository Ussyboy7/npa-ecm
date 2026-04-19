# `any` Types Fix Results

## Summary
Ran automation script to replace `any` types with safer alternatives (`unknown`, `Record<string, unknown>`, etc.)

---

## Replacements Made

### 1. Error Handling ✅
- `catch (error: any)` → `catch (error: unknown)`
- `catch (err: any)` → `catch (err: unknown)`

### 2. Type Assertions ✅
- `as any` → `as unknown`

### 3. Generic Types ✅
- `<any>` → `<Record<string, unknown>>`
- `apiFetch<any>` → `apiFetch<Record<string, unknown>>`
- `unwrapResults<any>` → `unwrapResults<Record<string, unknown>>`
- `Promise<any>` → `Promise<unknown>`
- `Array<any>` → `Array<unknown>`

### 4. Array Types ✅
- `any[]` → `unknown[]`

### 5. Record Types ✅
- `Record<string, any>` → `Record<string, unknown>`

### 6. Function Parameters ✅
- `(item: any)` → `(item: Record<string, unknown>)`
- `(user: any)` → `(user: Record<string, unknown>)`
- etc.

### 7. Variable Declarations ✅
- `let items: any[]` → `let items: unknown[]`
- `const data: any` → `const data: unknown`

---

## Results

**Before**: 474 `any` types across 96 files  
**After**: ~99 `any` types across 37 files  
**Reduction**: ~79% reduction (375 types fixed)

### Remaining Types Breakdown
- `as any` type assertions: ~30 instances (mostly for dynamic property access)
- `Record<string, any>`: ~15 instances (mostly in audit/params)
- Function parameters `(value: any)`: ~10 instances
- Array types `any[]` or `Array<any>`: ~5 instances
- Other patterns: ~39 instances

### Notes on Remaining Types
Most remaining `any` types are in:
1. **Dynamic property access** - `(item as any).flowType` - These may need proper type definitions
2. **API response handling** - `correspondence: any` - These should use proper API response types
3. **Function parameters** - `(field: keyof Case, value: any)` - These may need union types
4. **Record types** - `Record<string, any>` in audit params - These could be `Record<string, unknown>`

These remaining types are more complex and may require:
- Proper API response type definitions
- Union types for function parameters
- Type guards for dynamic property access

---

## Notes

⚠️ **Important**: 
- Some replacements may need manual review
- `Record<string, unknown>` is a safer default but may need proper API response types
- Type guards may be needed when using `unknown` types
- Run `npm run type-check` to verify (when Node.js available)

---

## Next Steps

1. **Review changes** - Check modified files for correctness
2. **Type checking** - Run TypeScript compiler to find errors
3. **Manual fixes** - Replace `Record<string, unknown>` with proper types where possible
4. **Type guards** - Add type guards for `unknown` types where needed

