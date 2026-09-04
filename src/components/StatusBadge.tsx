import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ratioToHex } from '@/engine/status-color';
import type { StatusKind } from '@/db/schema';
import { strings } from '@/strings';
import { useTheme } from '@/theme';

/** Status is always color + icon + text (§2: color is never the only signal). */
export const STATUS_ICON: Record<
  StatusKind,
  'remove-circle-outline' | 'arrow-downward' | 'trending-up' | 'check-circle'
> = {
  untrained: 'remove-circle-outline',
  low: 'arrow-downward',
  partial: 'trending-up',
  covered: 'check-circle',
};

export function StatusBadge({
  status,
  ratio,
  compact = false,
}: {
  status: StatusKind;
  ratio: number;
  compact?: boolean;
}) {
  const { colors, type, radii, spacing } = useTheme();
  const swatch = ratioToHex(ratio);
  return (
    <View
      style={[
        styles.row,
        {
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={strings.status[status]}>
      <View style={[styles.swatch, { backgroundColor: swatch }]} />
      <MaterialIcons name={STATUS_ICON[status]} size={16} color={colors.text} />
      {!compact && <Text style={[type.caption, { color: colors.text, marginLeft: 4 }]}>{strings.status[status]}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  swatch: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
});
