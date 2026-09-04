import * as Crypto from 'expo-crypto';

/** Client-generated UUID v4 (mocked with node:crypto in Jest). */
export function newId(): string {
  return Crypto.randomUUID();
}
