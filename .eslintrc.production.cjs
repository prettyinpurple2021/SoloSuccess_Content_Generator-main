module.exports = {
  extends: ['./.eslintrc.override.cjs'],
  rules: {
    // Suppress warnings that don't affect functionality in production
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/no-unescaped-entities': 'off',

    // Keep critical errors that could break functionality
    '@typescript-eslint/no-unsafe-function-type': 'error',
    'no-useless-catch': 'error',
    'no-undef': 'error',
    'react/display-name': 'off',

    // Suppress other non-critical warnings
    '@typescript-eslint/no-unused-imports': 'off',
    'prefer-const': 'off',
    'no-console': 'off',
    'no-debugger': 'off',
  },
};
