// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*', 'src/db/migrations/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      // The engine and tools rely on non-null assertions after explicit checks.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // react-three-fiber intrinsics (<primitive object=… />, attach, args)
      'react/no-unknown-property': ['error', { ignore: ['object', 'attach', 'args'] }],
    },
  },
]);
