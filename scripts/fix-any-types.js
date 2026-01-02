#!/usr/bin/env node

/**
 * Automated script to find and report 'any' types for manual fixing
 * Usage: node scripts/fix-any-types.js
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../frontend');

const SKIP_FILES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'types',
];

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        getFilesRecursively(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (!shouldSkipFile(filePath)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function findAnyTypes(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    // Find 'any' types
    const anyPatterns = [
      /:\s*any\b/g,
      /as\s+any\b/g,
      /<any>/g,
      /any\[\]/g,
      /Record<string,\s*any>/g,
    ];

    anyPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          file: path.relative(FRONTEND_DIR, filePath),
        });
      }
    });
  });

  return issues;
}

function main() {
  console.log('🔍 Scanning for "any" types...\n');
  
  const files = getFilesRecursively(FRONTEND_DIR);
  console.log(`Found ${files.length} TypeScript files to check\n`);

  const allIssues = [];

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const issues = findAnyTypes(content, file);
      if (issues.length > 0) {
        allIssues.push(...issues);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });

  if (allIssues.length === 0) {
    console.log('✅ No "any" types found!');
    return;
  }

  console.log(`\n📊 Found ${allIssues.length} instances of "any" type:\n`);

  // Group by file
  const byFile = {};
  allIssues.forEach(issue => {
    if (!byFile[issue.file]) {
      byFile[issue.file] = [];
    }
    byFile[issue.file].push(issue);
  });

  Object.keys(byFile).sort().forEach(file => {
    console.log(`\n📄 ${file}:`);
    byFile[file].forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.content.substring(0, 80)}${issue.content.length > 80 ? '...' : ''}`);
    });
  });

  console.log(`\n💡 Recommendation: Replace "any" with proper types or "unknown" with type guards`);
}

if (require.main === module) {
  main();
}

module.exports = { findAnyTypes, getFilesRecursively };

