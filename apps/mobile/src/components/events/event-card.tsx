import type { CampusEvent } from '@unisphere/types';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function EventCard({ event }: { event: CampusEvent }) {
  return (
    <Link
      href={{ pathname: '/event/[eventId]', params: { eventId: event.id } }}
      asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.dateBlock}>
          <Text style={styles.month}>
            {new Intl.DateTimeFormat(undefined, { month: 'short' })
              .format(new Date(event.startsAt))
              .toUpperCase()}
          </Text>
          <Text style={styles.day}>{new Date(event.startsAt).getDate()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.meta}>{formatEventDate(event.startsAt)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  dateBlock: {
    width: 56,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  month: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
  },
  day: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  details: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  meta: {
    color: colors.inkMuted,
    fontSize: 13,
  },
});
