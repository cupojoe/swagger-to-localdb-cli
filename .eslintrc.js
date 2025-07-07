module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'error',
  },
  env: {
    node: true,
    es6: true,
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        'no-unused-vars': 'off', // Disable base rule for TypeScript files
        'no-undef': 'off', // TypeScript handles this
      }
    }
  ]
};