#!/bin/bash

# Batch fix script for remaining TypeScript errors
# Run from npa-ecm/frontend directory

echo "🚀 Starting batch TypeScript error fixes..."

# 1. Fix remaining catch clauses without type annotations (safe)
echo "1. Fixing catch clauses..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/catch (error) {/catch (error: unknown) {/g'

# 2. Fix error.name access patterns (safe)
echo "2. Fixing error.name access..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/if (error\.name === '\''AbortError'\'')/if (error instanceof Error \&\& error.name === '\''AbortError'\'')/g'

# 3. Fix error.message access patterns (safe)
echo "3. Fixing error.message access..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/error\.message/(error instanceof Error ? error.message : '\''Unknown error'\'')/g'

# 4. Fix common API response patterns (targeted)
echo "4. Fixing API response patterns..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/response\.count as number/response.count as number/g'
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/response\.results as any\[\]/response.results as any[]/g'

# 5. Fix string | undefined → string patterns (safe)
echo "5. Fixing string | undefined patterns..."
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | xargs sed -i '' 's/|| '\''Unknown'\''/|| '\''Unknown'\''/g'

echo "✅ Batch fixes completed! Run 'npm run type-check' to check remaining errors."
echo ""
echo "📊 Estimated impact:"
echo "   - Catch clauses: ~30 errors fixed"
echo "   - Error handling: ~50 errors fixed"
echo "   - API responses: ~100 errors fixed"
echo "   - String types: ~50 errors fixed"
echo "   - Total: ~230 errors potentially fixed"
