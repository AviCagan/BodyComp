import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getDb, useDbMigrations } from '@/db/client';
import { ensureProfile } from '@/db/repositories';
import { seedExercises } from '@/db/seed';
import { preloadBodies } from '@/features/muscle-map/load-body';
import { clock } from '@/lib/clock';
import { useSessionStore } from '@/state/session';
import { useTheme } from '@/theme';

/**
 * Boot gate: applies migrations, seeds the exercise catalogue once per data
 * revision, loads the local profile, warms the 3D asset cache, then renders the
 * app. Never blocks on network.
 */
export function DbGate({ children }: { children: ReactNode }) {
  const { success, error } = useDbMigrations();
  const booted = useSessionStore((s) => s.booted);
  const bootError = useSessionStore((s) => s.bootError);
  const { colors, type } = useTheme();

  useEffect(() => {
    if (!success || useSessionStore.getState().booted) return;
    try {
      const db = getDb();
      const now = clock.now();
      seedExercises(db, now);
      useSessionStore.getState().setBooted(ensureProfile(db, now));
      preloadBodies();
    } catch (e) {
      useSessionStore.getState().setBootError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [success]);

  const err = error ?? bootError;
  if (err) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[type.heading, { color: colors.danger }]}>Could not open the database</Text>
        <Text style={[type.body, { color: colors.textMuted, marginTop: 8 }]}>{err.message}</Text>
      </View>
    );
  }
  if (!booted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } });
