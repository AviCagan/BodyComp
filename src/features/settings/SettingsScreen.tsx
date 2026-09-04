import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBadge } from '@/components/StatusBadge';
import { getDb } from '@/db/client';
import { updateProfile } from '@/db/repositories';
import type { BodyModel } from '@/db/schema';
import { DEFAULT_GROUP_IDS } from '@/engine/taxonomy';
import { mockGroupStatuses } from '@/features/muscle-map/mock-status';
import { useSessionStore } from '@/state/session';
import { groupNames, strings } from '@/strings';
import { clock } from '@/lib/clock';
import { useTheme } from '@/theme';

/**
 * Phase 0 Settings: body model switch, the "Muscle status (list)" accessibility path
 * (mock data until Phase 3), and About with data/model attribution.
 */
export function SettingsScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const profile = useSessionStore((s) => s.profile);
  const setProfile = useSessionStore((s) => s.setProfile);
  const statuses = useMemo(() => mockGroupStatuses(), []);

  const setBody = (bodyModel: BodyModel) => setProfile(updateProfile(getDb(), { bodyModel }, clock.now()));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={[type.label, { color: colors.textMuted }]}>Body model</Text>
      <View style={[styles.segment, { borderColor: colors.border, borderRadius: radii.md, marginTop: spacing.sm }]}>
        {(['female', 'male'] as const).map((b) => {
          const active = profile?.bodyModel === b;
          return (
            <Pressable
              key={b}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setBody(b)}
              style={[styles.segmentItem, { backgroundColor: active ? colors.primary : colors.surface }]}>
              <Text style={[type.label, { color: active ? colors.onPrimary : colors.text }]}>
                {b === 'female' ? strings.map.bodyFemale : strings.map.bodyMale}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        Changes which body the map shows. It does not change targets or scoring.
      </Text>

      <Text style={[type.label, { color: colors.textMuted, marginTop: spacing.xl }]}>Muscle status (list)</Text>
      <Text style={[type.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
        Sample data until the engine ships in Phase 3.
      </Text>
      {DEFAULT_GROUP_IDS.map((g) => (
        <View key={g} style={[styles.statusRow, { borderBottomColor: colors.border }]}>
          <Text style={[type.body, { color: colors.text, flex: 1 }]}>{groupNames[g]}</Text>
          <StatusBadge status={statuses[g].status} ratio={statuses[g].ratio} />
        </View>
      ))}

      <Text style={[type.label, { color: colors.textMuted, marginTop: spacing.xl }]}>About</Text>
      <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        Exercise catalogue from free-exercise-db (public domain, Unlicense). 3D body: placeholder primitives for the
        Phase 0 rendering spike; the shipped anatomy will be derived from Z-Anatomy and BodyParts3D (DBCLS), CC BY-SA
        4.0, with attribution here.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
});
