import type { CampusClub } from '@unisphere/types';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

export function ClubCard({ club }: { club: CampusClub }) {
  return (
    <Link href={{ pathname: '/club/[clubId]', params: { clubId: club.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{club.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{club.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {club.description ?? 'A student community at your college.'}
          </Text>
          <Text style={styles.events}>
            {club.upcomingEventCount}{' '}
            {club.upcomingEventCount === 1 ? 'upcoming event' : 'upcoming events'}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  logo: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  logoText: {
    color: colors.brand,
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  events: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    color: colors.inkMuted,
    fontSize: 28,
  },
});
