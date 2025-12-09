module.exports = {
  extends: ['./.eslintrc.cjs'],
  rules: {
    // Relax rules for error handling code where flexibility is needed
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern:
          '^_|^removed$|^error$|^severity$|^errorInfo$|^addReport$|^clearAll$|^fallbackError$|^type$|^context$',
        ignoreRestSiblings: true,
      },
    ],
    'react/no-unescaped-entities': 'off',
    'react/jsx-no-undef': 'off',
  },
};
