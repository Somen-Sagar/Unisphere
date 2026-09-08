import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.title}>Password recovery</Text>
      <Text style={styles.body}>
        Recovery email delivery will be enabled with the notification service. Contact your college
        administrator while the account recovery endpoint is being configured.
      </Text>
      <PrimaryButton label="Back to sign in" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xl },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  body: { color: colors.inkMuted, lineHeight: 24 },
});
