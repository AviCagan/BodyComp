import { useColorScheme } from 'react-native';
import { dark, light, radii, spacing, type, type Palette } from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  type: typeof type;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: scheme === 'dark' ? dark : light, spacing, radii, type };
}
