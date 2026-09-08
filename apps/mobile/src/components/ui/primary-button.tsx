import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

export function PrimaryButton({
  label,
  loading,
  disabled,
  ...props
}: PressableProps & { label: string; loading?: boolean }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.brand,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    backgroundColor: colors.brandDark,
  },
  disabled: {
    opacity: 0.55,
  },
});
