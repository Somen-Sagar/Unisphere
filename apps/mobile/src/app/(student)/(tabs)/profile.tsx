import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const canOrganize = user?.memberships.some(
    (membership) =>
      membership.status === 'ACTIVE' &&
      ['CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(
        membership.role,
      ),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.firstName.charAt(0)}</Text>
        </View>
        <Text style={styles.title}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {user?.memberships.map((membership) => (
        <View key={membership.id} style={styles.membership}>
          <Text style={styles.membershipName}>{membership.college.name}</Text>
          <Text style={styles.membershipMeta}>
            {membership.role.replaceAll('_', ' ')} · {membership.status}
          </Text>
        </View>
      ))}

      <Link href="/registrations" asChild>
        <Pressable style={styles.action}>
          <Text style={styles.actionText}>My registration passes</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>

      {canOrganize ? (
        <Link href="/(organizer)/scanner" asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Open attendance scanner</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
      ) : null}

      <PrimaryButton
        label="Sign out"
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: colors.brand,
  },
  avatarText: { color: colors.white, fontSize: 30, fontWeight: '800' },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  email: { color: colors.inkMuted },
  membership: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  membershipName: { color: colors.ink, fontWeight: '700' },
  membershipMeta: { color: colors.inkMuted, fontSize: 12 },
  action: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  actionText: { color: colors.ink, fontWeight: '600' },
  chevron: { color: colors.inkMuted, fontSize: 28 },
});
