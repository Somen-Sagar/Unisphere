import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  loginSchema,
  type LoginInput,
} from '@unisphere/validation';

import { FormField } from '@/components/ui/form-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, spacing, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (input) => {
    try {
      await login(input);
      router.replace('/(student)/(tabs)');
    } catch (error) {
      Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <Text style={styles.eyebrow}>UNISPHERE</Text>
        <Text style={styles.title}>Your campus, in one place.</Text>
        <Text style={styles.subtitle}>
          Discover events, carry your registration passes, and stay current with campus life.
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              label="College email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              label="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />
        <PrimaryButton label="Sign in" loading={isSubmitting} onPress={submit} />
        <Link href="/(auth)/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>

      <Text style={styles.footer}>
        New to UniSphere?{' '}
        <Link href="/(auth)/register" style={styles.link}>
          Create an account
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  brand: {
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.brand,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontSize: typography.hero,
    lineHeight: 42,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: spacing.lg,
  },
  link: {
    color: colors.brand,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
