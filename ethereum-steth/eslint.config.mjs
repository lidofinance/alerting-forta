import eslint from '@eslint/js'
import prettier from 'eslint-plugin-prettier'
import tseslint from 'typescript-eslint'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'

export default tseslint.config({
  ...eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  files: ['** /*.ts'],
  ignores: ['**/generated', '**/proto'],
  plugins: {
    prettier,
  },
  languageOptions: {
    globals: {
      ...globals.node,
    },
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
      sourceType: 'module',
    },
  },
  rules: {
    '@typescript-eslint/ array-type': 'error',
    '@typescript-eslint/ consistent-type-imports': 'error',
    'prettier/prettier': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    curly: 'error',
    semi: 'off',
  },
})
