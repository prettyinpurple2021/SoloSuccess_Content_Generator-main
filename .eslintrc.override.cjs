module.exports = {
  rules: {
    // Allow any types in error handling code where flexibility is needed
    '@typescript-eslint/no-explicit-any': [
      'warn',
      {
        ignoreRestArgs: true,
        fixToUnknown: false,
      },
    ],

    // Allow unused vars that start with underscore
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],

    // Allow unescaped entities in JSX for better readability
    'react/no-unescaped-entities': [
      'warn',
      {
        forbid: [
          { char: '>', alternatives: ['&gt;'] },
          { char: '}', alternatives: ['&#125;'] },
        ],
      },
    ],

    // Relax exhaustive deps for error handling hooks
    'react-hooks/exhaustive-deps': ['warn'],

    // Allow console in development
    'no-console': 'off', // Disabled for development convenience
  },

  overrides: [
    {
      // Special rules for error handling files
      files: [
        '**/components/Error*.tsx',
        '**/hooks/useError*.ts',
        '**/utils/errorUtils.ts',
        '**/services/errorHandlingService.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
