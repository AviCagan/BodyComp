import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '@/components/StatusBadge';
import { getDb } from '@/db/client';
import { updateProfile } from '@/db/repositories';
import { groupOfRegion } from '@/engine/taxonomy';
import { useSessionStore } from '@/state/session';
import { groupNames, regionNames, strings } from '@/strings';
import { clock } from '@/lib/clock';
import { useTheme } from '@/theme';
import { MuscleMapView, type MuscleMapViewHandle } from './MuscleMapView';
import { mockGroupStatuses, mockRegionStatuses } from './mock-status';
import type { SnapView } from './types';

const SNAPS: { view: SnapView; label: string }[] = [
  { view: 'front', label: strings.map.snapFront },
  { view: 'back', label: strings.map.snapBack },
  { view: 'left', label: strings.map.snapLeft },
  { view: 'right', label: strings.map.snapRight },
];

/** Map tab. Phase 0: the spike wired to mock statuses; full §6.2 chrome lands in Phase 1. */
export function MapScreen() {
  const { colors, type, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useSessionStore((s) => s.profile);
  const setProfile = useSessionStore((s) => s.setProfile);
  const mode = useSessionStore((s) => s.mapMode);
  const setMode = useSessionStore((s) => s.setMapMode);
  const selected = useSessionStore((s) => s.selectedRegion);
  const setSelected = useSessionStore((s) => s.setSelectedRegion);
  const mapRef = useRef<MuscleMapViewHandle>(null);
  const [glError, setGlError] = useState<Error | null>(null);

  const groupStatuses = useMemo(() => mockGroupStatuses(), []);
  const regionStatuses = useMemo(() => mockRegionStatuses(), []);
  const body = profile?.bodyModel ?? 'male';
  const selectedGroup = selected ? groupOfRegion(selected) : null;
  const selectedStatus = selected
    ? mode === 'regions'
      ? regionStatuses[selected]
      : groupStatuses[groupOfRegion(selected)]
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.sceneBackground }]}>
      <MuscleMapView
        ref={mapRef}
        body={body}
        mode={mode}
        groupStatuses={groupStatuses}
        regionStatuses={regionStatuses}
        selectedRegion={selected}
        onSelectRegion={(sel) => setSelected(sel ? sel.region : null)}
        onError={setGlError}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md }]}
        pointerEvents="box-none">
        <Text style={[type.heading, { color: colors.text }]}>{strings.map.title}</Text>
        <View style={styles.chipRow}>
          <Chip label={strings.map.modeGroups} active={mode === 'groups'} onPress={() => setMode('groups')} />
          <Chip label={strings.map.modeRegions} active={mode === 'regions'} onPress={() => setMode('regions')} />
          <View style={{ width: spacing.md }} />
          <Chip
            label={strings.map.bodyFemale}
            active={body === 'female'}
            onPress={() => setProfile(updateProfile(getDb(), { bodyModel: 'female' }, clock.now()))}
          />
          <Chip
            label={strings.map.bodyMale}
            active={body === 'male'}
            onPress={() => setProfile(updateProfile(getDb(), { bodyModel: 'male' }, clock.now()))}
          />
        </View>
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
          ]}>
          <Text style={[type.caption, { color: colors.textMuted }]}>{strings.map.spikeBanner}</Text>
        </View>
      </View>

      {glError ? (
        <View
          style={[
            styles.fallback,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, margin: spacing.lg },
          ]}>
          <Text style={[type.heading, { color: colors.text }]}>{strings.map.glUnavailableTitle}</Text>
          <Text style={[type.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            {strings.map.glUnavailableBody}
          </Text>
          <Text style={[type.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>{glError.message}</Text>
        </View>
      ) : null}

      <View
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm, paddingHorizontal: spacing.md }]}
        pointerEvents="box-none">
        {selected && selectedGroup && selectedStatus ? (
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: colors.text }]}>
                  {mode === 'regions' ? regionNames[selected] : groupNames[selectedGroup]}
                </Text>
                <Text style={[type.caption, { color: colors.textMuted }]}>
                  {mode === 'regions' ? groupNames[selectedGroup] : regionNames[selected]}
                  {selectedStatus.provisional ? ` · ${strings.status.estimated}` : ''}
                  {selectedStatus.underEmphasized && mode === 'regions' ? ` · ${strings.status.underEmphasized}` : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.common.close}
                onPress={() => setSelected(null)}
                style={styles.close}>
                <Text style={[type.label, { color: colors.primary }]}>{strings.common.close}</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <StatusBadge status={selectedStatus.status} ratio={selectedStatus.ratio} />
            </View>
          </View>
        ) : null}
        <View style={styles.chipRow}>
          {SNAPS.map((s) => (
            <Chip key={s.view} label={s.label} active={false} onPress={() => mapRef.current?.snapTo(s.view)} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, type, radii } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: colors.border,
          borderRadius: radii.pill,
        },
      ]}>
      <Text style={[type.label, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  banner: { marginTop: 8, padding: 8, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'flex-start' },
  fallback: { position: 'absolute', left: 0, right: 0, top: '30%', padding: 20, borderWidth: StyleSheet.hairlineWidth },
  sheet: { borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
