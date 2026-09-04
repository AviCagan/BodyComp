/** Design tokens. Light and dark palettes share the same status ramp (engine/status-color). */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const type = {
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;
/** Minimum touch target (§7 accessibility). */
export const MIN_TOUCH = 44;

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  /** Neutral for untracked model structures and empty states. */
  neutral: string;
  /** Scene background behind the 3D body. */
  sceneBackground: string;
}

export const light: Palette = {
  background: '#f7f7f8',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#15171a',
  textMuted: '#5f6670',
  border: '#e2e5ea',
  primary: '#1f6feb',
  onPrimary: '#ffffff',
  danger: '#c62828',
  neutral: '#b5b8be',
  sceneBackground: '#eef0f3',
};

export const dark: Palette = {
  background: '#0f1114',
  surface: '#171a1f',
  surfaceElevated: '#1e2228',
  text: '#f2f4f7',
  textMuted: '#9aa3ad',
  border: '#2a2f37',
  primary: '#5aa0ff',
  onPrimary: '#0b0d10',
  danger: '#ef5350',
  neutral: '#6b7078',
  sceneBackground: '#14171c',
};
