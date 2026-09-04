/**
 * Two projects:
 *  - node: pure TypeScript (engine, data, db, tools) — fast, no React Native preset
 *  - app:  components and screens with jest-expo
 */
const nodeTransform = { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] };

module.exports = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/(engine|data|db|lib)/**/*.test.ts', '<rootDir>/tools/**/*.test.ts'],
      setupFiles: ['<rootDir>/test/setup.node.ts'],
      transform: nodeTransform,
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^expo-crypto$': '<rootDir>/test/mocks/expo-crypto.ts',
        // drizzle's sync SQLite driver requires this specifier at module load; we serve it
        // from Node's built-in sqlite so there is no native module to compile.
        '^better-sqlite3$': '<rootDir>/src/db/node-sqlite-adapter.ts',
      },
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      // everything under src/ that the node project does not own, so no test is silently skipped
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/app/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/(engine|data|db|lib)/'],
      setupFiles: ['<rootDir>/test/setup.app.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // binary 3D assets are Metro assets (metro.config.js assetExts); stub them like images
        '\\.(glb|gltf)$': '<rootDir>/test/mocks/asset-module.ts',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|three|three-stdlib|@react-three/.*|zustand|drizzle-orm)',
      ],
    },
  ],
};
