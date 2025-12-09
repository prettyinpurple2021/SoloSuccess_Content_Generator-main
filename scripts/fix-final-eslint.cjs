const fs = require('fs');
const path = require('path');
const { validatePath } = require('../utils/pathValidator.cjs');

// Get project root
const projectRoot = path.join(__dirname, '..');

// Fix specific ESLint issues
const fixes = [
  // Fix unused variables by prefixing with underscore
  {
    file: 'components/ErrorBoundaryEnhanced.tsx',
    replacements: [
      {
        from: 'const severity = this.getErrorSeverity();',
        to: 'const _severity = this.getErrorSeverity();',
      },
      {
        from: 'const { error, errorInfo, errorId, showDetails } = this.state;',
        to: 'const { error, errorInfo: _errorInfo, errorId, showDetails } = this.state;',
      },
    ],
  },
  {
    file: 'components/ErrorReportingSystem.tsx',
    replacements: [
      {
        from: 'const addReport = useCallback((error: Error, context?: Record<string, any>) => {',
        to: 'const _addReport = useCallback((error: Error, context?: Record<string, any>) => {',
      },
      { from: '} catch (error) {', to: '} catch (_error) {' },
    ],
  },
  {
    file: 'components/LoadingStateManager.tsx',
    replacements: [
      {
        from: 'const { [key]: removed, ...rest } = prev;',
        to: 'const { [key]: _removed, ...rest } = prev;',
      },
    ],
  },
  {
    file: 'components/UserFeedbackSystem.tsx',
    replacements: [
      { from: "don't", to: 'don&apos;t' },
      { from: "can't", to: 'can&apos;t' },
      {
        from: "export const QuickFeedback: React.FC<{\n  onFeedback: (type: 'positive' | 'negative', comment?: string) => void;\n  className?: string;\n}> = ({ onFeedback, className = '' }) => {",
        to: "export const QuickFeedback: React.FC<{\n  onFeedback: (_type: 'positive' | 'negative', _comment?: string) => void;\n  className?: string;\n}> = ({ onFeedback, className = '' }) => {",
      },
    ],
  },
  {
    file: 'hooks/useErrorRecovery.ts',
    replacements: [{ from: '} catch (fallbackError) {', to: '} catch (_fallbackError) {' }],
  },
  {
    file: 'hooks/useErrorState.ts',
    replacements: [
      {
        from: 'const { [field]: removed, ...rest } = prev;',
        to: 'const { [field]: _removed, ...rest } = prev;',
      },
    ],
  },
];

// Apply fixes
fixes.forEach(({ file, replacements }) => {
  const fullPath = validatePath(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    replacements.forEach(({ from, to }) => {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
    });

    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('Final ESLint fixes applied!');
