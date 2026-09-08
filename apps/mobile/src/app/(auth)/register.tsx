import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  registerSchema,
  type RegisterInput,
} from '@unisphere/validation';

import { FormField } from '@/components/ui/form-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type CollegeFormErrors = {
  studentId?: { message?: string };
};

export default function RegisterScreen() {
  const router = useRouter();
  const { api, register } = useAuth();
  const colleges = useQuery({
    queryKey: ['colleges'],
    queryFn: () => api.colleges(),
  });
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'STUDENT',
      termsAccepted: true,
      college: {
        mode: 'join',
        collegeId: '',
        studentId: '',
      },
    },
  });
  const selectedCollege = useWatch({ control, name: 'college' });
  const selectedCollegeId =
    selectedCollege.mode === 'join' ? selectedCollege.collegeId : '';
  const collegeErrors = errors.college as CollegeFormErrors | undefined;

  const submit = handleSubmit(async (input) => {
    try {
      await register(input);
      router.replace('/(student)/(tabs)');
    } catch (error) {
      Alert.alert(
        'Could not create account',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Join your campus</Text>
        <Text style={styles.subtitle}>
          Your college membership may require verification before event registration is enabled.
        </Text>
      </View>

      <View style={styles.row}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.half}>
              <FormField
                label="First name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.firstName?.message}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onBlur, onChange, value } }) => (
            <View style={styles.half}>
              <FormField
                label="Last name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.lastName?.message}
              />
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            label="College email"
            autoCapitalize="none"
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
        name="college.studentId"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            label="Student ID (optional)"
            autoCapitalize="characters"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ''}
            error={collegeErrors?.studentId?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            label="Password"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
          />
        )}
      />

      <View style={styles.colleges}>
        <Text style={styles.label}>Select college (optional)</Text>
        {colleges.data?.map((college) => (
          <Pressable
            key={college.id}
            onPress={() =>
              setValue('college', {
                mode: 'join',
                collegeId: college.id,
                studentId: selectedCollege.mode === 'join' ? selectedCollege.studentId : '',
              })
            }
            style={[
              styles.college,
              selectedCollegeId === college.id && styles.collegeSelected,
            ]}>
            <Text style={styles.collegeName}>{college.name}</Text>
            <Text style={styles.collegeLocation}>
              {[college.city, college.state].filter(Boolean).join(', ')}
            </Text>
          </Pressable>
        ))}
        {colleges.isError ? (
          <Text style={styles.error}>Colleges could not be loaded. You can join one later.</Text>
        ) : null}
      </View>

      <PrimaryButton label="Create account" loading={isSubmitting} onPress={submit} />
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back to sign in</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.inkMuted,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  colleges: {
    gap: spacing.sm,
  },
  label: {
    color: colors.ink,
    fontWeight: '600',
  },
  college: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  collegeSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  collegeName: {
    color: colors.ink,
    fontWeight: '700',
  },
  collegeLocation: {
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
  },
  back: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '700',
  },
});
