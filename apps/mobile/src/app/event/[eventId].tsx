import { isRegistrationAvailable } from '@unisphere/business-rules';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useEvent } from '@/features/events/queries';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { api } = useAuth();
  const event = useEvent(eventId);
  const registration = useMutation({
    mutationFn: () => api.registerForEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['registrations'] });
      Alert.alert('You are registered', 'Your offline-ready pass is available in My registrations.', [
        { text: 'View pass', onPress: () => router.push('/registrations') },
        { text: 'Done' },
      ]);
    },
    onError: (error) => {
      Alert.alert('Registration unavailable', error instanceof Error ? error.message : 'Try again.');
    },
  });

  if (event.isLoading) return <LoadingScreen label="Loading event…" />;
  if (!event.data) {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.error}>This event could not be found.</Text>
      </Screen>
    );
  }

  const canRegister = isRegistrationAvailable(event.data);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.status}>{event.data.status.replaceAll('_', ' ')}</Text>
        <Text style={styles.title}>{event.data.title}</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Starts</Text>
          <Text style={styles.infoValue}>{formatDate(event.data.startsAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Venue</Text>
          <Text style={styles.infoValue}>{event.data.venue}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Registered</Text>
          <Text style={styles.infoValue}>
            {event.data.registeredCount}
            {event.data.capacity ? ` / ${event.data.capacity}` : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>About this event</Text>
      <Text style={styles.description}>{event.data.description}</Text>
      <PrimaryButton
        label={canRegister ? 'Register for event' : 'Registration unavailable'}
        disabled={!canRegister}
        loading={registration.isPending}
        onPress={() => registration.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  hero: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: colors.ink,
    fontSize: typography.hero,
    lineHeight: 43,
    fontWeight: '800',
  },
  infoCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  infoLabel: {
    width: 74,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    color: colors.ink,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    color: colors.inkMuted,
    lineHeight: 25,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
});
