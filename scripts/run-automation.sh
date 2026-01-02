#!/bin/bash

# Alternative automation script using grep/sed for console statement replacement
# This works without Node.js

set -e

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../frontend" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Running automation (Node.js-free version)..."
echo ""

# Find all TypeScript files (properly handle spaces in paths)
FILES=$(find "$FRONTEND_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" ! -path "*/build/*" ! -name "client-logger.ts")

TOTAL_FILES=$(echo "$FILES" | wc -l | tr -d ' ')
MODIFIED_COUNT=0

echo "Found $TOTAL_FILES TypeScript files to check"
echo ""

# Process files one by one, properly handling paths with spaces
echo "$FILES" | while IFS= read -r file || [ -n "$file" ]; do
  [ -z "$file" ] && continue
  
  RELATIVE_PATH="${file#$FRONTEND_DIR/}"
  
  # Check if file has console statements
  if grep -q "console\.\(log\|warn\|error\)" "$file" 2>/dev/null; then
    echo "📝 Processing: $RELATIVE_PATH"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Check if already has client-logger import
    if grep -q "from '@/lib/client-logger'" "$file" 2>/dev/null; then
      HAS_IMPORT=1
    else
      HAS_IMPORT=0
    fi
    
    # Replace console.error (simple cases)
    sed -i '' 's/console\.error(/logError(/g' "$file" 2>/dev/null || true
    
    # Replace console.warn
    sed -i '' 's/console\.warn(/logWarn(/g' "$file" 2>/dev/null || true
    
    # Replace console.log
    sed -i '' 's/console\.log(/logInfo(/g' "$file" 2>/dev/null || true
    
    # Add import if needed and file was modified
    if [ "$HAS_IMPORT" = "0" ] && grep -q "logError\|logWarn\|logInfo" "$file" 2>/dev/null; then
      # Find first import line
      FIRST_IMPORT=$(grep -n "^import" "$file" 2>/dev/null | head -1 | cut -d: -f1)
      if [ -n "$FIRST_IMPORT" ]; then
        # Add import after first import
        sed -i '' "${FIRST_IMPORT}a\\
import { logError, logWarn, logInfo } from '@/lib/client-logger';
" "$file" 2>/dev/null || true
      else
        # Add at top if no imports
        sed -i '' "1i\\
import { logError, logWarn, logInfo } from '@/lib/client-logger';
\\
" "$file" 2>/dev/null || true
      fi
    fi
    
    # Check if file was actually modified
    if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
      MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
      echo "  ✅ Modified"
      rm "$file.bak"
    else
      echo "  ⏭️  No changes needed"
      rm "$file.bak"
    fi
  fi
done

echo ""
echo "📊 Summary:"
echo "   Processed: $TOTAL_FILES files"
echo "   Modified: $MODIFIED_COUNT files"
echo ""
echo "✅ Done!"
echo ""
echo "⚠️  Note: This is a basic replacement. Please review changes and:"
echo "   1. Fix any edge cases manually"
echo "   2. Test affected components"
echo "   3. Run TypeScript compiler to check for errors"
