#!/usr/bin/env node

/**
 * Automated script to replace console statements with proper logging
 * Usage: node scripts/replace-console-statements.js
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../frontend');

// Files to skip (already processed or special cases)
const SKIP_FILES = [
  'client-logger.ts', // The logger itself
  'node_modules',
  '.next',
  'dist',
  'build',
];

// Console statement patterns to replace
const REPLACEMENTS = [
  {
    pattern: /console\.error\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: (match, quote, message, error) => {
      return `logError(${quote}${message}${quote}, ${error})`;
    },
    requiresImport: 'logError',
  },
  {
    pattern: /console\.warn\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: (match, quote, message, error) => {
      return `logWarn(${quote}${message}${quote}, ${error})`;
    },
    requiresImport: 'logWarn',
  },
  {
    pattern: /console\.log\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: (match, quote, message, data) => {
      return `logInfo(${quote}${message}${quote}, ${data})`;
    },
    requiresImport: 'logInfo',
  },
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: (match, args) => {
      // Check if it's a simple string or has multiple args
      if (args.includes(',')) {
        const parts = args.split(',').map(p => p.trim());
        const message = parts[0];
        const error = parts.slice(1).join(', ');
        return `logError(${message}, ${error})`;
      }
      return `logError(${args})`;
    },
    requiresImport: 'logError',
  },
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: (match, args) => {
      if (args.includes(',')) {
        const parts = args.split(',').map(p => p.trim());
        const message = parts[0];
        const error = parts.slice(1).join(', ');
        return `logWarn(${message}, ${error})`;
      }
      return `logWarn(${args})`;
    },
    requiresImport: 'logWarn',
  },
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: (match, args) => {
      if (args.includes(',')) {
        const parts = args.split(',').map(p => p.trim());
        const message = parts[0];
        const data = parts.slice(1).join(', ');
        return `logInfo(${message}, ${data})`;
      }
      return `logInfo(${args})`;
    },
    requiresImport: 'logInfo',
  },
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

function checkImports(content) {
  const imports = {
    logError: content.includes('logError'),
    logWarn: content.includes('logWarn'),
    logInfo: content.includes('logInfo'),
  };

  const hasClientLoggerImport = /from\s+['"]@\/lib\/client-logger['"]/.test(content);
  
  return { imports, hasClientLoggerImport };
}

function addImports(content, neededImports) {
  if (neededImports.length === 0) return content;

  // Check if import already exists
  const { hasClientLoggerImport } = checkImports(content);
  
  if (hasClientLoggerImport) {
    // Update existing import
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/client-logger['"]/;
    const match = content.match(importRegex);
    
    if (match) {
      const existingImports = match[1].split(',').map(i => i.trim());
      const allImports = [...new Set([...existingImports, ...neededImports])].sort();
      const newImport = `import { ${allImports.join(', ')} } from '@/lib/client-logger';`;
      return content.replace(importRegex, newImport);
    }
  }

  // Add new import after the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    const newImport = `import { ${neededImports.join(', ')} } from '@/lib/client-logger';`;
    importLines.splice(lastImportIndex + 1, 0, newImport);
    return importLines.join('\n');
  }

  // Fallback: add at the top
  return `import { ${neededImports.join(', ')} } from '@/lib/client-logger';\n${content}`;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const neededImports = new Set();

  // Apply replacements
  REPLACEMENTS.forEach(({ pattern, replacement, requiresImport }) => {
    if (pattern.test(content)) {
      neededImports.add(requiresImport);
      content = content.replace(pattern, replacement);
    }
  });

  // Add imports if needed
  if (neededImports.size > 0) {
    content = addImports(content, Array.from(neededImports));
  }

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function main() {
  console.log('🔍 Scanning for console statements...\n');
  
  const files = getFilesRecursively(FRONTEND_DIR);
  console.log(`Found ${files.length} TypeScript files to check\n`);

  let processedCount = 0;
  let modifiedCount = 0;

  files.forEach(file => {
    processedCount++;
    const relativePath = path.relative(FRONTEND_DIR, file);
    
    try {
      const modified = processFile(file);
      if (modified) {
        modifiedCount++;
        console.log(`✅ Modified: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${relativePath}:`, error.message);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processedCount} files`);
  console.log(`   Modified: ${modifiedCount} files`);
  console.log(`\n✅ Done!`);
}

if (require.main === module) {
  main();
}

module.exports = { processFile, getFilesRecursively };

