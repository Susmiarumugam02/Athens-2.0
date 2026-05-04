import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // SAP Takeover SOP: Prevent importing legacy UI directly
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/components/ui-legacy/**', '@/components/ui-legacy/**'],
          message: 'Do not import from ui-legacy. Use @/components/ui/* or @/ui/sap/* instead. See UI_SOP.md'
        }]
      }]
    }
  },
  // Allow ui-legacy imports only in shim files
  {
    files: ['src/components/ui/index.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  }
])
