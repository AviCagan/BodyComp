import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_NAME } from '@/config';
import { getDb } from '@/db/client';
import { countExercises, searchExercises } from '@/db/repositories';
import { useTheme } from '@/theme';

/**
 * Phase 0 stand-in for the Log tab: an exercise search over the seeded catalogue so
 * the on-device build proves migrations, seeding and the repository layer. The real
 * Strong-parity logger arrives in Phase 2.
 */
export function LogScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const [query, setQuery] = useState('');
  const db = getDb();
  const total = useMemo(() => countExercises(db), [db]);
  const results = useMemo(() => searchExercises(db, { query, limit: 40 }), [db, query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[type.title, { color: colors.text }]}>{APP_NAME}</Text>
        <Text style={[type.caption, { color: colors.textMuted, marginTop: 4 }]}>
          {total} exercises loaded. Logging arrives in Phase 2.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises (name or alias)"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={[
            type.body,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radii.md,
              padding: spacing.md,
              marginTop: spacing.md,
              minHeight: 44,
            },
          ]}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border, minHeight: 44 }]}>
            <Text style={[type.body, { color: colors.text }]}>{item.name}</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>
              {item.equipment.replace('_', ' ')} · {item.pattern}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
});
