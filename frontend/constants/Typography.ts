/**
 * Typography system
 */

export const FontFamily = {
  // Display font for luxury headings
  display: 'System', // We'll use system as fallback, can load custom fonts
  // Sans for UI and body text  
  sans: 'System',
  // Mono for code and data
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

import { Platform } from 'react-native';

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 15,
  lg: 17,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  '4xl': 44,
  '5xl': 56,
  '6xl': 72,
};

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.6,
};
