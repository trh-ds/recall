import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: keyof typeof styles;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  // --- design-doc scale. Tracking is px in RN, so these are the em values × size. ---
  /** Briefing hero. Two of these stacked are the whole above-the-fold message. */
  hero: { fontSize: 34, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  /** The one thing a card is about — "CS241 Lab". */
  cardTitle: { fontSize: 27, lineHeight: 31, fontWeight: '600', letterSpacing: -0.7 },
  headline: { fontSize: 19, lineHeight: 25, fontWeight: '500', letterSpacing: -0.2 },
  /** Row titles inside cards. */
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  /** Section eyebrows. Always uppercase, always mono, always wide. */
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  /** Clocks and countdowns — mono so digits don't jitter as they tick. */
  numeral: { fontFamily: Fonts.mono, fontSize: 19, lineHeight: 24 },

  // --- pre-existing roles, kept for the test screens ---
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
