/**
 * The app's single clock. Repositories and the engine take `now` as a parameter; UI
 * code obtains it here so tests can fake time and so components stay pure.
 */
export const clock = {
  now: (): number => Date.now(),
};
