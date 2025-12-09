#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { validatePath } = require('../utils/pathValidator.cjs');

// Get project root
const projectRoot = path.join(__dirname, '..');

// Files to fix
const filesToFix = [
  'components/ErrorBoundaryEnhanced.tsx',
  'components/LoadingStateManager.tsx',
  'components/UserFeedbackSystem.tsx',
  'components/ErrorReportingSystem.tsx',
  'hooks/useErrorRecovery.ts',
  'hooks/useErrorState.ts',
  'utils/errorUtils.ts',
];

// Common fixes
const fixes = [
  // Remove unused imports
  {
    pattern: /import.*{[^}]*MessageCircle[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*MessageCircle\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*Bug[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*Bug\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*Filter[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*Filter\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*Calendar[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*Calendar\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*Clock[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*Clock\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*FileText[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*FileText\s*,?/, '').replace(/,\s*}/, ' }'),
  },
  {
    pattern: /import.*{[^}]*Zap[^}]*}.*from.*'lucide-react';/g,
    replacement: (match) => match.replace(/,?\s*Zap\s*,?/, '').replace(/,\s*}/, ' }'),
  },

  // Fix unused variables by prefixing with underscore
  {
    pattern: /const\s+(\w+)\s*=\s*[^;]+;\s*\/\/\s*unused/g,
    replacement: 'const _$1 = $2; // unused',
  },

  // Fix React quotes
  {
    pattern: /don't/g,
    replacement: 'don&apos;t',
  },
  {
    pattern: /can't/g,
    replacement: 'can&apos;t',
  },
  {
    pattern: /won't/g,
    replacement: 'won&apos;t',
  },
  {
    pattern: /isn't/g,
    replacement: 'isn&apos;t',
  },
];

// Apply fixes to files
filesToFix.forEach((filePath) => {
  const fullPath = validatePath(projectRoot, filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    fixes.forEach((fix) => {
      if (typeof fix.replacement === 'function') {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        content = content.replace(fix.pattern, fix.replacement);
      }
    });

    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  }
});

console.log('ESLint fixes applied!');
