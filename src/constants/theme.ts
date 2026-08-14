/**
 * Design tokens for Recall (see the design doc, "Agent design system v0.1").
 *
 * Dark is the default surface — the app is read at 07:00 and 23:00, and the later
 * wrist port is OLED. Light is a full peer, not a tint of dark.
 *
 * Surface ladder: background < backgroundElement (cards) < backgroundSelected
 * (segmented tracks, insets) < backgroundRaised (secondary buttons).
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14161A',
    textSecondary: '#5B626D',
    textMuted: '#71787F',
    background: '#F5F6F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEEF2',
    backgroundRaised: '#E1E5EA',
    hairline: 'rgba(16,18,22,0.08)',
    accent: '#3E63DD',
    accentWash: '#E8EDFF',
    accentEdge: 'rgba(62,99,221,0.28)',
    /** Text/icons sitting on top of `accent`. */
    onAccent: '#FFFFFF',
    warn: '#A2620C',
    urgent: '#C4402C',
    urgentEdge: 'rgba(196,64,44,0.25)',
    done: '#0E7C55',
    scrim: 'rgba(16,18,22,0.55)',
  },
  dark: {
    text: '#F2F4F7',
    textSecondary: '#9AA1AC',
    textMuted: '#8A9099',
    background: '#0B0C0E',
    backgroundElement: '#131417',
    backgroundSelected: '#1A1C20',
    backgroundRaised: '#23262B',
    hairline: 'rgba(255,255,255,0.07)',
    accent: '#7C9BFF',
    accentWash: '#1B2138',
    accentEdge: 'rgba(124,155,255,0.30)',
    onAccent: '#0B0C0E',
    warn: '#F2B25C',
    urgent: '#FF8A7A',
    urgentEdge: 'rgba(255,138,122,0.22)',
    done: '#6FD3A6',
    scrim: 'rgba(5,6,8,0.72)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** r-sm chips · r-md buttons · r-lg cards · r-sheet bottom sheets. */
export const Radius = { sm: 8, md: 14, lg: 20, sheet: 26 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
