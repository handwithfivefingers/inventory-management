// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import perfectionist, { rules } from 'eslint-plugin-perfectionist'
import vitest from '@vitest/eslint-plugin'

// export default tseslint.config([
//   {
//     ignores: ['**/*.js']
//   },
//   eslint.configs.recommended,
//   tseslint.configs.strictTypeChecked,
//   tseslint.configs.stylisticTypeChecked,
//   {
//     languageOptions: {
//       parserOptions: {
//         projectService: true,
//         tsconfigRootDir: import.meta.dirname
//       }
//     }
//   },
//   perfectionist.configs['recommended-natural'],
//   {
//     files: ['**/*.test.ts', '**/*.spec.ts'],
//     plugins: {
//       vitest
//     },
//     rules: {
//       ...vitest.configs.recommended.rules,
//       '@typescript-eslint/unbound-method': 'off',
//       // '@typescript-eslint/no-floating-promises': 'off',
//       // 'perfectionist/sort-imports': ['off']
//     }
//   }
// ])

export default [
  {
    ignores: ['**/*.js']
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  perfectionist.configs['recommended-natural'],
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      vitest
    },
    rules: {
      ...vitest.configs.recommended.rules,
      // '@typescript-eslint/unbound-method': 'off'
      '@typescript-eslint/no-floating-promises': ['error']
      // 'perfectionist/sort-imports': ['off']
    }
  }
]
