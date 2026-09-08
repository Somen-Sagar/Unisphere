import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';

export function useUpcomingEvents() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () =>
      api.events({
        upcoming: true,
        pageSize: 30,
      }),
  });
}

export function useEvent(eventId: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.event(eventId),
    enabled: Boolean(eventId),
  });
}
