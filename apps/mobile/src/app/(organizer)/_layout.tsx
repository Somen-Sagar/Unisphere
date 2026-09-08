import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function OrganizerLayout() {
  const { isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;

  const canOrganize = user.memberships.some(
    (membership) =>
      membership.status === 'ACTIVE' &&
      ['CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(
        membership.role,
      ),
  );
  if (!canOrganize) return <Redirect href="/(student)/(tabs)" />;

  return (
    <Stack>
      <Stack.Screen name="scanner" options={{ title: 'Attendance scanner' }} />
    </Stack>
  );
}
