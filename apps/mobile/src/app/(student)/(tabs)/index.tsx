import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EventCard } from '@/components/events/event-card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { useUpcomingEvents } from '@/features/events/queries';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function StudentHomeScreen() {
  const { user } = useAuth();
  const activeMembership =
    user?.memberships.find((membership) => membership.status === 'ACTIVE') ??
    user?.memberships[0];
  const events = useUpcomingEvents();

  if (events.isLoading) return <LoadingScreen label="Loading your campus…" />;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{activeMembership?.college.name ?? 'UNISPHERE'}</Text>
          <Text style={styles.title}>Hello, {user?.firstName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.firstName.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      {activeMembership?.status === 'PENDING' ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Membership verification pending</Text>
          <Text style={styles.noticeBody}>
            You can discover events now. Registration unlocks after your college approves your
            membership.
          </Text>
        </View>
      ) : null}

      <View style={styles.quickGrid}>
        <Link href="/registrations" asChild>
          <Pressable style={styles.quickCard}>
            <Text style={styles.quickIcon}>▣</Text>
            <Text style={styles.quickTitle}>My passes</Text>
            <Text style={styles.quickBody}>Registration QR codes</Text>
          </Pressable>
        </Link>
        <Link href="/(student)/(tabs)/assistant" asChild>
          <Pressable style={styles.quickCard}>
            <Text style={styles.quickIcon}>✦</Text>
            <Text style={styles.quickTitle}>Ask campus AI</Text>
            <Text style={styles.quickBody}>Find answers quickly</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming events</Text>
        <Link href="/(student)/(tabs)/events" style={styles.link}>
          See all
        </Link>
      </View>

      {events.isError ? (
        <Text style={styles.error}>Events could not be loaded. Check the API URL and try again.</Text>
      ) : events.data?.items.length ? (
        events.data.items.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No upcoming events yet</Text>
          <Text style={styles.emptyBody}>Published events from your college will appear here.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: spacing.xs,
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '800',
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.brand,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  notice: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#FFF6DE',
  },
  noticeTitle: {
    color: '#795400',
    fontWeight: '700',
  },
  noticeBody: {
    color: '#795400',
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickCard: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
  },
  quickIcon: {
    color: colors.white,
    fontSize: 24,
  },
  quickTitle: {
    color: colors.white,
    fontWeight: '700',
  },
  quickBody: {
    color: '#BFC6D4',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  link: {
    color: colors.brand,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    lineHeight: 22,
  },
  empty: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.inkMuted,
  },
});
