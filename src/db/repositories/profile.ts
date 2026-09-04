import { eq } from 'drizzle-orm';
import { profile, type Profile } from '../schema';
import type { Db } from '../types';

export const LOCAL_PROFILE_ID = 'local';

export function getProfile(db: Db): Profile | undefined {
  return db.select().from(profile).where(eq(profile.id, LOCAL_PROFILE_ID)).get();
}

/** Creates the single local profile row on first launch. */
export function ensureProfile(db: Db, now: number): Profile {
  const existing = getProfile(db);
  if (existing) return existing;
  db.insert(profile).values({ id: LOCAL_PROFILE_ID, createdAt: now, updatedAt: now }).run();
  return getProfile(db)!;
}

export function updateProfile(
  db: Db,
  patch: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>,
  now: number,
): Profile {
  db.update(profile)
    .set({ ...patch, updatedAt: now })
    .where(eq(profile.id, LOCAL_PROFILE_ID))
    .run();
  return getProfile(db)!;
}
