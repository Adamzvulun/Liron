import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // Only the app is linted; docs/ (with its spikes) and sources/ are throwaway or reference material.
  globalIgnores(['dist', 'docs', 'sources', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
  {
    // A browser test takes `test` from its fixtures, which fail it when the page crashes.
    files: ['tests/e2e/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              allowTypeImports: true,
              message: 'Import test and expect from ./fixtures.ts (tests/e2e/fixtures.ts).',
            },
          ],
        },
      ],
    },
  },
]);
