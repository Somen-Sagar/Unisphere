import type { CampusEvent, EventStatus, MembershipRole } from '@unisphere/types';

const allowedTransitions: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['DRAFT', 'PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'ONGOING', 'CANCELLED'],
  REGISTRATION_CLOSED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionEvent(from: EventStatus, to: EventStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function canManageEvents(roles: MembershipRole[]): boolean {
  return roles.some((role) =>
    ['CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
  );
}

export function isRegistrationAvailable(event: CampusEvent, now = new Date()): boolean {
  if (!['PUBLISHED', 'REGISTRATION_OPEN'].includes(event.status)) return false;
  if (event.registrationOpensAt && now < new Date(event.registrationOpensAt)) return false;
  if (event.registrationClosesAt && now > new Date(event.registrationClosesAt)) return false;
  if (event.capacity !== null && event.registeredCount >= event.capacity) return false;
  return now < new Date(event.startsAt);
}

export function eventsConflict(
  first: Pick<CampusEvent, 'startsAt' | 'endsAt'>,
  second: Pick<CampusEvent, 'startsAt' | 'endsAt'>,
): boolean {
  return new Date(first.startsAt) < new Date(second.endsAt) &&
    new Date(second.startsAt) < new Date(first.endsAt);
}
