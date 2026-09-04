/**
 * The map modules statically import the .glb bodies. This guards the Jest asset stub so
 * any component test that reaches MuscleMapView/DbGate keeps loading.
 */
import { preloadBodies } from '../load-body';
import { MuscleMapView } from '../MuscleMapView';

jest.mock('expo-asset', () => ({
  Asset: { fromModule: () => ({ downloadAsync: async () => ({ localUri: 'file:///x.glb' }) }) },
}));
jest.mock('expo-file-system', () => ({ File: class {} }));

describe('muscle-map modules', () => {
  it('import with the binary asset stub in place', () => {
    expect(typeof preloadBodies).toBe('function');
    expect(MuscleMapView).toBeDefined();
  });
});
