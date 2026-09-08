import { StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';

import { EventCard } from '@/components/events/event-card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { useUpcomingEvents } from '@/features/events/queries';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EventsScreen() {
  const [search, setSearch] = useState('');
  const events = useUpcomingEvents();

  if (events.isLoading) return <LoadingScreen label="Finding events…" />;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filtered = events.data?.items.filter(
    (event) =>
      !normalizedSearch ||
      `${event.title} ${event.description} ${event.venue}`
        .toLocaleLowerCase()
        .includes(normalizedSearch),
  );

  return (
    <Screen>
      <Text style={styles.title}>Discover events</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search events or venues"
        placeholderTextColor={colors.inkMuted}
        style={styles.search}
      />
      {events.isError ? (
        <Text style={styles.error}>Could not connect to the events API.</Text>
      ) : filtered?.length ? (
        filtered.map((event) => <EventCard key={event.id} event={event} />)
      ) : (
        <Text style={styles.empty}>No matching upcoming events.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '800',
  },
  search: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
