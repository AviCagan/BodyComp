import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { strings } from '@/strings';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialIcons name={name} color={color} size={size} />;
  };
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.log, tabBarIcon: icon('edit-note') }} />
      <Tabs.Screen name="history" options={{ title: strings.tabs.history, tabBarIcon: icon('calendar-month') }} />
      <Tabs.Screen
        name="map"
        options={{ title: strings.tabs.map, tabBarIcon: icon('accessibility-new'), headerShown: false }}
      />
      <Tabs.Screen name="progress" options={{ title: strings.tabs.progress, tabBarIcon: icon('trending-up') }} />
      <Tabs.Screen name="settings" options={{ title: strings.tabs.settings, tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
