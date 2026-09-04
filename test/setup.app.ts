import 'react-native-gesture-handler/jestSetup';

// Reanimated 4 + worklets under Jest
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();

// Native modules the app shell touches at boot. Data access itself is tested in the node project.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite is not available under Jest; mock @/db/client');
  },
}));
