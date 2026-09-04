import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '@/strings';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: strings.notFound.title }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{strings.notFound.body}</Text>
        <Link href="/" style={styles.link}>
          <Text style={{ color: colors.primary }}>{strings.notFound.goHome}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  link: { marginTop: 15, paddingVertical: 15 },
});
