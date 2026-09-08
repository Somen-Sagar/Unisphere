import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, Text, View } from 'react-native';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function RegistrationsScreen() {
  const { api } = useAuth();
  const registrations = useQuery({
    queryKey: ['registrations', 'me'],
    queryFn: () => api.myRegistrations(),
  });

  if (registrations.isLoading) return <LoadingScreen label="Loading your passes…" />;

  return (
    <Screen>
      <Text style={styles.title}>My event passes</Text>
      <Text style={styles.intro}>
        Open this screen before arriving. Previously loaded passes remain visible while the app
        stays open, even if the campus network drops.
      </Text>
      {registrations.isError ? (
        <Text style={styles.error}>Your passes could not be loaded.</Text>
      ) : registrations.data?.length ? (
        registrations.data.map((registration) => (
          <View key={registration.id} style={styles.pass}>
            <Text style={styles.eventTitle}>{registration.event.title}</Text>
            <Text style={styles.meta}>{registration.event.venue}</Text>
            <View style={styles.qr}>
              <QRCode
                value={`unisphere://registration/${registration.qrToken}`}
                size={190}
                color={colors.ink}
                backgroundColor={colors.white}
              />
            </View>
            <Text style={styles.status}>
              {registration.checkedInAt ? 'CHECKED IN' : registration.status}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No passes yet</Text>
          <Text style={styles.meta}>Register for an event and its QR pass will appear here.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  intro: { color: colors.inkMuted, lineHeight: 22 },
  pass: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eventTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  meta: { color: colors.inkMuted, textAlign: 'center' },
  qr: {
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  status: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  error: { color: colors.danger },
  empty: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
});
