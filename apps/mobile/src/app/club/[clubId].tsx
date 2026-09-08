import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EventCard } from '@/components/events/event-card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { useClub } from '@/features/clubs/queries';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ClubProfileScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const club = useClub(clubId);

  if (club.isLoading) return <LoadingScreen label="Opening club profile…" />;
  if (!club.data) {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.error}>This club could not be found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{club.data.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{club.data.name}</Text>
        <Text style={styles.description}>
          {club.data.description ?? 'A student community at your college.'}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming events</Text>
        <Text style={styles.count}>{club.data.upcomingEventCount}</Text>
      </View>
      {club.data.upcomingEvents.length ? (
        club.data.upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
          <Text style={styles.emptyBody}>New events from this club will appear here.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  logo: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
  },
  logoText: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    maxWidth: 520,
    color: colors.inkMuted,
    lineHeight: 23,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  count: {
    minWidth: 30,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    color: colors.brand,
    backgroundColor: colors.brandSoft,
    fontWeight: '800',
    textAlign: 'center',
    overflow: 'hidden',
  },
  empty: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: { color: colors.ink, fontWeight: '700' },
  emptyBody: { color: colors.inkMuted },
  error: { color: colors.danger, textAlign: 'center' },
});
