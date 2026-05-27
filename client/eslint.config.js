// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([globalIgnores(['dist']), {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.vitest,
    },
  },
}, {
  // Forbid direct firebase/firestore imports outside the data layer. UI and
  // feature code must go through repositories under @/lib/data/repositories/*.
  files: ['src/**/*.{ts,tsx}'],
  ignores: [
    'src/lib/data/firestore/**',
    'src/lib/data/repositories/**',
    'src/lib/firebase/**',
  ],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'firebase/firestore',
        message: 'Direct firebase/firestore imports are restricted. Use repositories under @/lib/data/repositories/* instead.',
      }],
    }],
  },
}, ...storybook.configs["flat/recommended"]])
