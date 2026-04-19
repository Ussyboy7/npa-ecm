#!/bin/bash

# Script to organize documentation files into proper folder structure
# Usage: ./scripts/organize-docs.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"

# Create directory structure
mkdir -p "$DOCS_DIR"/{implementation,reviews,migrations,guides,archive}

echo "📁 Organizing documentation files..."
echo ""

# Implementation summaries
echo "📝 Moving implementation summaries..."
mv "$ROOT_DIR"/*IMPLEMENTATION*.md "$DOCS_DIR/implementation/" 2>/dev/null || true
mv "$ROOT_DIR"/*COMPLETE*.md "$DOCS_DIR/implementation/" 2>/dev/null || true
mv "$ROOT_DIR"/*STATUS*.md "$DOCS_DIR/implementation/" 2>/dev/null || true
mv "$ROOT_DIR"/*SUMMARY*.md "$DOCS_DIR/implementation/" 2>/dev/null || true

# Reviews
echo "🔍 Moving review documents..."
mv "$ROOT_DIR"/*REVIEW*.md "$DOCS_DIR/reviews/" 2>/dev/null || true
mv "$ROOT_DIR"/*CRITICAL*.md "$DOCS_DIR/reviews/" 2>/dev/null || true
mv "$ROOT_DIR"/*ANALYSIS*.md "$DOCS_DIR/reviews/" 2>/dev/null || true

# Migrations
echo "🔄 Moving migration guides..."
mv "$ROOT_DIR"/*MIGRATION*.md "$DOCS_DIR/migrations/" 2>/dev/null || true
mv "$ROOT_DIR"/*LOCALSTORAGE*.md "$DOCS_DIR/migrations/" 2>/dev/null || true
mv "$ROOT_DIR"/*TEMPLATE*.md "$DOCS_DIR/migrations/" 2>/dev/null || true

# Guides
echo "📚 Moving guides..."
mv "$ROOT_DIR"/*GUIDE*.md "$DOCS_DIR/guides/" 2>/dev/null || true
mv "$ROOT_DIR"/*INSTALLATION*.md "$DOCS_DIR/guides/" 2>/dev/null || true
mv "$ROOT_DIR"/*DEPENDENCY*.md "$DOCS_DIR/guides/" 2>/dev/null || true

# Keep important files in root
echo "📌 Keeping important files in root..."
# These stay in root:
# - README.md
# - TODO.md
# - NEXT_STEPS.md
# - IMPLEMENTATION_PROGRESS.md
# - CLEANUP_COMPLETE.md
# - COMPREHENSIVE_FOLDER_REVIEW.md

# Move everything else to archive
echo "📦 Moving remaining docs to archive..."
find "$ROOT_DIR" -maxdepth 1 -name "*.md" -type f ! -name "README.md" ! -name "TODO.md" ! -name "NEXT_STEPS.md" ! -name "IMPLEMENTATION_PROGRESS.md" ! -name "CLEANUP_COMPLETE.md" ! -name "COMPREHENSIVE_FOLDER_REVIEW.md" -exec mv {} "$DOCS_DIR/archive/" \; 2>/dev/null || true

echo ""
echo "✅ Documentation organized!"
echo ""
echo "📊 Structure:"
echo "   docs/implementation/ - Implementation summaries"
echo "   docs/reviews/ - Code reviews"
echo "   docs/migrations/ - Migration guides"
echo "   docs/guides/ - User/developer guides"
echo "   docs/archive/ - Other documentation"
echo ""

