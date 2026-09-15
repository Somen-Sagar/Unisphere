import type { CampusEvent } from '@unisphere/types';

type EventRecord = {
  id: string;
  collegeId: string;
  clubId: string | null;
  departmentId: string | null;
  title: string;
  slug: string;
  description: string;
  eventType: string;
  venue: string;
  onlineMeetingUrl: string | null;
  imageUrl: string | null;
  posterUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  feeAmount: { toString(): string } | number | string | null;
  currency: string;
  status: CampusEvent['status'];
  _count: { registrations: number };
};

export function toCampusEvent(event: EventRecord): CampusEvent {
  return {
    id: event.id,
    collegeId: event.collegeId,
    clubId: event.clubId,
    departmentId: event.departmentId,
    title: event.title,
    slug: event.slug,
    description: event.description,
    eventType: event.eventType,
    venue: event.venue,
    onlineMeetingUrl: event.onlineMeetingUrl,
    imageUrl: event.imageUrl,
    posterUrl: event.posterUrl,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    registrationOpensAt: event.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: event.registrationClosesAt?.toISOString() ?? null,
    capacity: event.capacity,
    feeAmount: event.feeAmount?.toString() ?? null,
    currency: event.currency,
    registeredCount: event._count.registrations,
    status: event.status,
  };
}
