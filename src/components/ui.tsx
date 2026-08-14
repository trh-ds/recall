/**
 * The glanceable primitives from the design system. Everything here is one flat
 * surface, a hairline, and a radius — depth is reserved for things that overlay
 * (sheets, the mic bar), so a raised edge always means "this is on top of your day".
 */

import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({
  children,
  borderColor,
  style,
}: {
  children: ReactNode;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: borderColor ?? theme.hairline },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Section eyebrow. Accent means "the agent has something here"; muted means "reference". */
export function Eyebrow({ children, tone = 'muted' }: { children: ReactNode; tone?: 'accent' | 'muted' }) {
  return (
    <ThemedText type="meta" themeColor={tone === 'accent' ? 'accent' : 'textMuted'}>
      {children}
    </ThemedText>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt)}
            style={[styles.segment, active && { backgroundColor: theme.backgroundRaised }]}>
            <ThemedText type="label" themeColor={active ? 'text' : 'textSecondary'}>
              {opt}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const skin: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: theme.accent },
    secondary: { backgroundColor: theme.backgroundRaised },
    ghost: { borderWidth: 1, borderColor: theme.hairline },
  };
  const textColor: Record<ButtonVariant, ThemeColor> = {
    primary: 'onAccent',
    secondary: 'text',
    ghost: 'textSecondary',
  };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, skin[variant], pressed && styles.pressed, style]}>
      <ThemedText type="body" themeColor={textColor[variant]} style={styles.buttonLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Checkbox({ done }: { done: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.checkbox,
        done
          ? { backgroundColor: theme.done }
          : { borderWidth: 1.5, borderColor: theme.textMuted },
      ]}>
      {done ? (
        <ThemedText type="label" themeColor="background">
          ✓
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 18 },
  track: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3 },
  segment: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: Radius.sm },
  button: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonLabel: { fontWeight: '600' },
  pressed: { opacity: 0.75 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
