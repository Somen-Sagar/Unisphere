import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { colors, spacing, typography } from '@/theme/tokens';

export default function VerifyEmailScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.title}>Check your college email</Text>
      <Text style={styles.body}>
        Open the verification link sent by UniSphere. This screen also handles the
        unisphere:// deep link when email verification is enabled.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xl },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  body: { color: colors.inkMuted, lineHeight: 24 },
});
