import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { isLoading, user } = useAuth();
  if (isLoading) return <LoadingScreen label="Opening UniSphere…" />;
  return <Redirect href={user ? '/(student)/(tabs)' : '/(auth)/login'} />;
}
