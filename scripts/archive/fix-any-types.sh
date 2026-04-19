#!/bin/bash

# Script to replace 'any' types with safer alternatives
# This makes the code more type-safe, though some manual review may be needed

set -e

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../frontend" && pwd)"

echo "🔍 Fixing 'any' types across the codebase..."
echo ""

# Find all TypeScript files
FILES=$(find "$FRONTEND_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -name "client-logger.ts")

TOTAL_FILES=$(echo "$FILES" | wc -l | tr -d ' ')
MODIFIED_COUNT=0

echo "Found $TOTAL_FILES TypeScript files to check"
echo ""

# Process files one by one
echo "$FILES" | while IFS= read -r file || [ -n "$file" ]; do
  [ -z "$file" ] && continue
  
  RELATIVE_PATH="${file#$FRONTEND_DIR/}"
  
  # Check if file has 'any' types
  if grep -qE "(:\s*any\b|as\s+any\b|<any>|any\[\]|Record<string,\s*any>|Promise<any>|Array<any>)" "$file" 2>/dev/null; then
    echo "📝 Processing: $RELATIVE_PATH"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Replacements (order matters - do more specific first)
    
    # 1. Record<string, any> → Record<string, unknown>
    sed -i '' 's/Record<string,\s*any>/Record<string, unknown>/g' "$file" 2>/dev/null || true
    
    # 2. Promise<any> → Promise<unknown>
    sed -i '' 's/Promise<any>/Promise<unknown>/g' "$file" 2>/dev/null || true
    
    # 3. Array<any> → Array<unknown>
    sed -i '' 's/Array<any>/Array<unknown>/g' "$file" 2>/dev/null || true
    
    # 4. catch (error: any) → catch (error: unknown)
    sed -i '' 's/catch\s*(error:\s*any)/catch (error: unknown)/g' "$file" 2>/dev/null || true
    sed -i '' 's/catch\s*(error:\s*Record<string,\s*unknown>)/catch (error: unknown)/g' "$file" 2>/dev/null || true
    
    # 5. catch (err: any) → catch (err: unknown)
    sed -i '' 's/catch\s*(err:\s*any)/catch (err: unknown)/g' "$file" 2>/dev/null || true
    sed -i '' 's/catch\s*(err:\s*Record<string,\s*unknown>)/catch (err: unknown)/g' "$file" 2>/dev/null || true
    
    # 6. as any → as unknown (safer)
    sed -i '' 's/as\s+any\b/as unknown/g' "$file" 2>/dev/null || true
    
    # 7. any[] → unknown[] (safer default)
    sed -i '' 's/any\[\]/unknown[]/g' "$file" 2>/dev/null || true
    
    # 8. apiFetch<any> → apiFetch<Record<string, unknown>> (safer default for API responses)
    sed -i '' 's/apiFetch<any>/apiFetch<Record<string, unknown>>/g' "$file" 2>/dev/null || true
    
    # 9. unwrapResults<any> → unwrapResults<Record<string, unknown>>
    sed -i '' 's/unwrapResults<any>/unwrapResults<Record<string, unknown>>/g' "$file" 2>/dev/null || true
    
    # 10. Function parameters: (item: any) → (item: Record<string, unknown>)
    # This is more complex, so we'll do it carefully
    perl -i -pe 's/\((\w+):\s*any\)/($1: Record<string, unknown>)/g' "$file" 2>/dev/null || true
    
    # 11. Variable declarations: : any → : unknown (but not function parameters)
    # This is tricky - we want to avoid breaking function parameters we just fixed
    # So we'll be more specific
    perl -i -pe 's/(let|const|var)\s+(\w+):\s*any\b/$1 $2: unknown/g' "$file" 2>/dev/null || true
    
    # 12. Generic types: <any> → <Record<string, unknown>> (but not apiFetch/unwrapResults we already did)
    perl -i -pe 's/<any>/<Record<string, unknown>>/g' "$file" 2>/dev/null || true
    
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
echo "⚠️  Important Notes:"
echo "   1. Review all changes - some may need manual adjustment"
echo "   2. Check for type errors: npm run type-check (when Node.js available)"
echo "   3. Some 'any' types may need proper types instead of 'unknown'"
echo "   4. Function parameters were changed to Record<string, unknown> - may need proper API types"
echo "   5. Test affected components to ensure no runtime errors"

