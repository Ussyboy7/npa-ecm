# Automation Scripts

## Overview
Scripts to automate code quality improvements and maintenance tasks.

---

## Scripts

### 1. `replace-console-statements.js`
**Purpose**: Automatically replace console statements with proper logging

**Usage**:
```bash
node scripts/replace-console-statements.js
```

**What it does**:
- Scans all `.tsx` and `.ts` files in `frontend/`
- Replaces `console.error()` with `logError()`
- Replaces `console.warn()` with `logWarn()`
- Replaces `console.log()` with `logInfo()`
- Automatically adds necessary imports from `@/lib/client-logger`
- Updates existing imports if they already exist

**Note**: Review changes before committing. Some console statements may need manual adjustment.

---

### 2. `organize-docs.sh`
**Purpose**: Organize documentation files into proper folder structure

**Usage**:
```bash
./scripts/organize-docs.sh
```

**What it does**:
- Moves implementation summaries to `docs/implementation/`
- Moves review documents to `docs/reviews/`
- Moves migration guides to `docs/migrations/`
- Moves guides to `docs/guides/`
- Moves remaining docs to `docs/archive/`
- Keeps important files (README.md, TODO.md, etc.) in root

**Note**: Review moved files and update any references.

---

### 3. `fix-any-types.js`
**Purpose**: Find and report all `any` types for manual fixing

**Usage**:
```bash
node scripts/fix-any-types.js
```

**What it does**:
- Scans all `.tsx` and `.ts` files
- Finds instances of `any` type
- Reports file, line number, and code snippet
- Groups by file for easy review

**Note**: This is a reporting tool. Manual fixes are required.

---

## Running Scripts

### Prerequisites
- **Option 1**: Node.js installed (for JavaScript scripts)
- **Option 2**: Bash shell (for shell scripts - works without Node.js)

### Execution

#### With Node.js (Recommended)
```bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh
chmod +x scripts/*.js

# Run scripts
node scripts/replace-console-statements.js
./scripts/organize-docs.sh
node scripts/fix-any-types.js
```

#### Without Node.js (Alternative)
```bash
# Use bash-based automation (works without Node.js)
./scripts/run-automation.sh
./scripts/organize-docs.sh
```

**Note**: The bash-based automation (`run-automation.sh`) uses `sed` for replacements and may need manual review for complex cases.

---

## Manual Review Required

After running automation scripts:
1. Review all changes
2. Test affected components
3. Fix any edge cases
4. Update imports if needed
5. Commit changes

---

## Status

- ✅ Scripts created
- ⚠️ Manual fixes still needed for edge cases
- ⚠️ Documentation organization needs review

