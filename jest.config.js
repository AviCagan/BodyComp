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
      testMatch: [
        '<rootDir>/src/engine/**/*.test.ts',
        '<rootDir>/src/data/**/*.test.ts',
        '<rootDir>/src/db/**/*.test.ts',
        '<rootDir>/tools/**/*.test.ts',
      ],
      transform: nodeTransform,
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^expo-crypto$': '<rootDir>/test/mocks/expo-crypto.ts' },
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/app/**/*.test.tsx'],
      setupFiles: ['<rootDir>/test/setup.app.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|three|three-stdlib|@react-three/.*|zustand|drizzle-orm)',
      ],
    },
  ],
};
