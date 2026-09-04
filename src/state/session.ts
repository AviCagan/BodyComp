import { create } from 'zustand';
import type { Profile } from '@/db/schema';
import type { RegionId } from '@/engine/taxonomy';

export type MapMode = 'groups' | 'regions';

interface SessionState {
  /** true once migrations, seed and profile load have finished */
  booted: boolean;
  bootError: Error | null;
  profile: Profile | null;
  setBooted: (profile: Profile) => void;
  setBootError: (error: Error | null) => void;
  setProfile: (p: Profile) => void;
  mapMode: MapMode;
  setMapMode: (m: MapMode) => void;
  selectedRegion: RegionId | null;
  setSelectedRegion: (r: RegionId | null) => void;
}

/** UI/session state only. The database is the source of truth (§3). */
export const useSessionStore = create<SessionState>((set) => ({
  booted: false,
  bootError: null,
  profile: null,
  setBooted: (profile) => set({ profile, booted: true }),
  setBootError: (bootError) => set({ bootError }),
  setProfile: (profile) => set({ profile }),
  mapMode: 'groups',
  setMapMode: (mapMode) => set({ mapMode }),
  selectedRegion: null,
  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
}));
