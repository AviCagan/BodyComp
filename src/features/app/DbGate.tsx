import { Component, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getDb, useDbMigrations } from '@/db/client';
import { ensureProfile } from '@/db/repositories';
import { seedExercises } from '@/db/seed';
import { preloadBodies } from '@/features/muscle-map/load-body';
import { clock } from '@/lib/clock';
import { useSessionStore } from '@/state/session';
import { strings } from '@/strings';
import { useTheme } from '@/theme';

/**
 * Boot gate: applies migrations, seeds the exercise catalogue once per data
 * revision, loads the local profile, warms the 3D asset cache, then renders the
 * app. Never blocks on network. Any failure (including opening the database)
 * shows a retry screen instead of a dead end.
 */
export function DbGate({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <BootErrorBoundary key={attempt} onRetry={() => setAttempt((a) => a + 1)}>
      <Boot attempt={attempt}>{children}</Boot>
    </BootErrorBoundary>
  );
}

function Boot({ attempt, children }: { attempt: number; children: ReactNode }) {
  const { success, error } = useDbMigrations();
  const booted = useSessionStore((s) => s.booted);
  const bootError = useSessionStore((s) => s.bootError);

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
  }, [success, attempt]);

  const err = error ?? bootError;
  if (err) throw err;
  if (!booted) return <BootSpinner />;
  return <>{children}</>;
}

function BootSpinner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function BootFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { colors, type, radii } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[type.heading, { color: colors.danger }]}>{strings.boot.failedTitle}</Text>
      <Text style={[type.body, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
        {strings.boot.failedBody}
      </Text>
      <Text style={[type.caption, { color: colors.textMuted, marginTop: 8 }]}>{error.message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: colors.primary, borderRadius: radii.md }]}>
        <Text style={[type.label, { color: colors.onPrimary }]}>{strings.common.retry}</Text>
      </Pressable>
    </View>
  );
}

class BootErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  retry = () => {
    useSessionStore.getState().setBootError(null);
    this.props.onRetry();
  };
  override render() {
    if (this.state.error) return <BootFailed error={this.state.error} onRetry={this.retry} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retry: {
    marginTop: 20,
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
