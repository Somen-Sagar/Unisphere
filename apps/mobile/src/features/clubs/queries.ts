import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';

export function useClubs() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['clubs'],
    queryFn: () => api.clubs(),
  });
}

export function useClub(clubId: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['club', clubId],
    queryFn: () => api.club(clubId),
    enabled: Boolean(clubId),
  });
}
