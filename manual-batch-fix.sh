#!/bin/bash

# MANUAL BATCH FIX SCRIPT - Run these commands one by one in your terminal
# Run from npa-ecm/frontend directory

echo "🚀 MANUAL BATCH FIX SCRIPT"
echo "Run these commands in your terminal from the npa-ecm/frontend directory"
echo ""

echo "📁 Step 1: Create backup (run this first)"
echo "cp -r . ../typescript-backup-$(date +%Y%m%d-%H%M%S)/"
echo ""

echo "🔧 Step 2: Fix catch clauses (94 files to fix)"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/catch (error) {/catch (error: unknown) {/g'"
echo ""

echo "🔧 Step 3: Fix error.name access patterns"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/error\.name === \"AbortError\"/error instanceof Error \&\& error.name === \"AbortError\"/g'"
echo ""

echo "🔧 Step 4: Fix error.message access patterns"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/error\.message/(error instanceof Error ? error.message : \"Unknown error\")/g'"
echo ""

echo "🔧 Step 5: Fix API response patterns"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/response\.count/response.count as number/g'"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/\.results || \[\]/\.results as any[] || []/g'"
echo ""

echo "🔧 Step 6: Fix property access patterns"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/item\.id/item.id as string/g'"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/item\.title/item.title as string/g'"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/item\.status/item.status as string/g'"
echo ""

echo "🔧 Step 7: Fix summary property access"
echo "find . -name \"*.tsx\" -o -name \"*.ts\" | grep -v node_modules | xargs sed -i '' 's/response\.summary/response.summary as Record<string, unknown>/g'"
echo ""

echo "🔧 Step 8: Run ESLint auto-fix"
echo "npm run lint -- --fix"
echo ""

echo "✅ COMPLETION CHECK:"
echo "npm run type-check  # Check remaining errors"
echo "npm run build      # Test if build works"
