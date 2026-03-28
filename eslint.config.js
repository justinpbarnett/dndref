/** @type {import('eslint').Linter.Config} */
module.exports = [
  {
    plugins: {
      'project-limits': require('./eslint-plugin-project-limits.js'),
    },
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['node_modules/**', 'dist/**', '.expo/**'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'project-limits/max-lines': ['error', { max: 300 }],
      'project-limits/max-dir-files': ['error', { max: 20 }],
    },
  },
];
