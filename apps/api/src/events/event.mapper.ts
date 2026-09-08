import type { CampusEvent } from '@unisphere/types';

type EventRecord = {
  id: string;
  collegeId: string;
  clubId: string | null;
  title: string;
  description: string;
  venue: string;
  imageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  status: CampusEvent['status'];
  _count: { registrations: number };
};

export function toCampusEvent(event: EventRecord): CampusEvent {
  return {
    id: event.id,
    collegeId: event.collegeId,
    clubId: event.clubId,
    title: event.title,
    description: event.description,
    venue: event.venue,
    imageUrl: event.imageUrl,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
    capacity: event.capacity,
    registeredCount: event._count.registrations,
    status: event.status,
  };
}
