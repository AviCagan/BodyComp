import { Canvas, type RootState } from '@react-three/fiber/native';
import {
  Component,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { BODY_BASE_MESH, groupOfRegion, isRegionId, type GroupId, type RegionId } from '@/engine/taxonomy';
import { useTheme } from '@/theme';
import { BodyScene } from './BodyScene';
import { computePaint, createPaintTable, regionsHighlightedBy } from './colors';
import { CAMERA } from './constants';
import { useMapGestures, type RigState } from './gestures';
import { loadBody, type LoadedBody } from './load-body';
import type { BodyModel, MapMode, MuscleMapSelection, MuscleStatus, SnapView } from './types';

/**
 * Public props — FROZEN at the end of Phase 0 (brief §8). Changing this interface needs an ADR.
 * The same component serves the Map tab, the intake priority picker (`selectionMode="pick"`)
 * and the finish-workout recolor (`interactive={false}` + `autoRotate`). If the fiber
 * renderer is ever replaced by the WebView fallback, it must keep exactly these props.
 */
export interface MuscleMapViewProps {
  body: BodyModel;
  mode: MapMode;
  groupStatuses: Partial<Record<GroupId, MuscleStatus>>;
  /** Used in `regions` mode; a region without an entry inherits its group's status. */
  regionStatuses?: Partial<Record<RegionId, MuscleStatus>>;
  /** Optional groups (tibialis, neck, hip flexors) render neutral unless listed here. */
  enabledOptionalGroups?: readonly GroupId[];
  /** Controlled selection (detail mode). */
  selectedRegion?: RegionId | null;
  onSelectRegion?: (selection: MuscleMapSelection | null) => void;
  /** `detail` (default): tap selects one region/group. `pick`: tap toggles a group in `pickedGroups`. */
  selectionMode?: 'detail' | 'pick';
  pickedGroups?: readonly GroupId[];
  onTogglePickedGroup?: (group: GroupId) => void;
  /** false = no gestures (finish screen, previews). */
  interactive?: boolean;
  /** Slow continuous yaw (finish screen). */
  autoRotate?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
  style?: StyleProp<ViewStyle>;
}

export interface MuscleMapViewHandle {
  snapTo(view: SnapView): void;
  resetView(): void;
}

const EMPTY_GROUPS: readonly GroupId[] = [];
const scratchPointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

export const MuscleMapView = forwardRef<MuscleMapViewHandle, MuscleMapViewProps>(function MuscleMapView(props, ref) {
  const {
    body,
    mode,
    groupStatuses,
    regionStatuses,
    enabledOptionalGroups = EMPTY_GROUPS,
    selectedRegion = null,
    onSelectRegion,
    selectionMode = 'detail',
    pickedGroups = EMPTY_GROUPS,
    onTogglePickedGroup,
    interactive = true,
    autoRotate = false,
    onReady,
    onError,
    style,
  } = props;
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState<LoadedBody | null>(null);
  const stateRef = useRef<RootState | null>(null);
  const readyRef = useRef(false);

  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onErrorRef.current = onError;
    onReadyRef.current = onReady;
  }, [onError, onReady]);

  // Load (or swap) the body; the camera rig and selection live outside and survive the swap.
  useEffect(() => {
    let cancelled = false;
    loadBody(body)
      .then((b) => {
        if (!cancelled) setLoaded(b);
      })
      .catch((e: unknown) => {
        if (!cancelled) onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [body]);

  // Paint targets: recomputed only when inputs change, never per frame.
  const paintRef = useRef(createPaintTable());
  const [paintVersion, setPaintVersion] = useState(0);
  useEffect(() => {
    computePaint(paintRef.current, {
      mode,
      groupStatuses,
      regionStatuses,
      enabledOptionalGroups,
      selectedRegion,
      selectionMode,
      pickedGroups,
      accentHex: colors.primary,
    });
    setPaintVersion((v) => v + 1);
  }, [
    mode,
    groupStatuses,
    regionStatuses,
    enabledOptionalGroups,
    selectedRegion,
    selectionMode,
    pickedGroups,
    colors.primary,
  ]);

  const pulseRegions = useMemo(
    () => (selectionMode === 'detail' && selectedRegion ? regionsHighlightedBy(selectedRegion, mode) : []),
    [selectedRegion, mode, selectionMode],
  );

  // Gesture bridge → one render per rig change.
  const onRigChange = useCallback((_rig: RigState) => {
    stateRef.current?.invalidate();
  }, []);

  const pick = useCallback(
    (x: number, y: number) => {
      const state = stateRef.current?.get();
      const current = loaded;
      if (!state || !current) return;
      const { size, camera } = state;
      scratchPointer.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
      raycaster.setFromCamera(scratchPointer, camera);
      const hits = raycaster.intersectObjects(current.root.children, false);
      const hit = hits.find((h) => h.object.visible);
      const name = hit?.object.name ?? null;
      if (!name || name === BODY_BASE_MESH || !isRegionId(name)) {
        if (selectionMode === 'detail') onSelectRegion?.(null);
        return;
      }
      const group = groupOfRegion(name);
      if (selectionMode === 'pick') onTogglePickedGroup?.(group);
      else onSelectRegion?.({ region: name, group });
    },
    [loaded, onSelectRegion, onTogglePickedGroup, selectionMode],
  );

  const { gesture, rigRef, snapTo, resetView } = useMapGestures({
    enabled: interactive,
    autoRotate,
    onRigChange,
    onTap: pick,
  });
  useImperativeHandle(ref, () => ({ snapTo, resetView }), [snapTo, resetView]);

  const onFirstFrame = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current?.();
  }, []);

  const handleError = useCallback((e: Error) => onErrorRef.current?.(e), []);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.fill, style]} collapsable={false}>
        <SceneErrorBoundary onError={handleError}>
          <Canvas
            frameloop="demand"
            // Fiber's own touch responder is disabled so react-native-gesture-handler owns every touch.
            events={null as unknown as undefined}
            pointerEvents="none"
            style={styles.fill}
            camera={{
              fov: CAMERA.fovDeg,
              near: CAMERA.near,
              far: CAMERA.far,
              position: [0, CAMERA.targetY, CAMERA.distance],
            }}
            onCreated={(state) => {
              stateRef.current = state;
              state.gl.setClearColor(new THREE.Color(colors.sceneBackground), 1);
            }}>
            {loaded ? (
              <BodyScene
                loaded={loaded}
                rigRef={rigRef}
                paintRef={paintRef}
                paintVersion={paintVersion}
                pulseRegions={pulseRegions}
                neutralHex={colors.neutral}
                backgroundHex={colors.sceneBackground}
                onFirstFrame={onFirstFrame}
              />
            ) : null}
          </Canvas>
        </SceneErrorBoundary>
      </View>
    </GestureDetector>
  );
});

class SceneErrorBoundary extends Component<{ children: ReactNode; onError: (e: Error) => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
