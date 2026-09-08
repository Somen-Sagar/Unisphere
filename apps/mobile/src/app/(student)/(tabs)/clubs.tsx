import { StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';

import { ClubCard } from '@/components/clubs/club-card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { useClubs } from '@/features/clubs/queries';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ClubsScreen() {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const membership =
    user?.memberships.find((item) => item.status === 'ACTIVE') ??
    user?.memberships[0];
  const clubs = useClubs();

  if (clubs.isLoading) return <LoadingScreen label="Loading campus clubs…" />;

  const term = search.trim().toLocaleLowerCase();
  const filtered = clubs.data?.filter(
    (club) =>
      !term ||
      `${club.name} ${club.description ?? ''}`.toLocaleLowerCase().includes(term),
  );

  return (
    <Screen>
      <Text style={styles.eyebrow}>
        {(membership?.college.name ?? 'YOUR COLLEGE').toUpperCase()}
      </Text>
      <Text style={styles.title}>Campus clubs</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search clubs"
        placeholderTextColor={colors.inkMuted}
        style={styles.search}
      />

      {clubs.isError ? (
        <Text style={styles.error}>The club directory could not be loaded.</Text>
      ) : filtered?.length ? (
        filtered.map((club) => <ClubCard key={club.id} club={club} />)
      ) : (
        <Text style={styles.empty}>No matching active clubs.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '800',
  },
  search: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  error: { color: colors.danger },
  empty: {
    marginTop: spacing.xxl,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
