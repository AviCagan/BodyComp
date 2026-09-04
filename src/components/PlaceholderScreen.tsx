import { StyleSheet, Text, View } from 'react-native';
import { strings } from '@/strings';
import { useTheme } from '@/theme';

export function PlaceholderScreen({ title, phase }: { title: string; phase: string }) {
  const { colors, type, spacing } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}>
      <Text style={[type.heading, { color: colors.text }]}>{title}</Text>
      <Text style={[type.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
        {strings.placeholder.comingSoon(phase)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
