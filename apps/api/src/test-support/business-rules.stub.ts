import type {
  CampusEvent,
  ClubMembershipRole,
  ClubPermission,
  EventStatus,
  MembershipRole,
} from '@unisphere/types';

export function defaultClubPermissions(
  role: ClubMembershipRole,
): ClubPermission[] {
  if (['CLUB_LEAD', 'ADMIN', 'PRESIDENT'].includes(role)) {
    return [
      'CLUB_VIEW_MEMBERS',
      'CLUB_MANAGE_MEMBERS',
      'CLUB_EDIT_PROFILE',
      'CLUB_MANAGE_ROLES',
      'CLUB_CREATE_EVENT',
      'CLUB_EDIT_EVENT',
      'CLUB_DELETE_EVENT',
      'CLUB_PUBLISH_EVENT',
      'CLUB_VIEW_REGISTRATIONS',
      'CLUB_MANAGE_REGISTRATIONS',
      'CLUB_MARK_ATTENDANCE',
      'CLUB_POST_ANNOUNCEMENT',
      'CLUB_MANAGE_RECRUITMENT',
      'CLUB_VIEW_ANALYTICS',
      'CLUB_MANAGE_MEDIA',
      'CLUB_MANAGE_PERMISSIONS',
    ];
  }
  if (['CLUB_SUB_LEAD', 'LEAD', 'SECRETARY'].includes(role)) {
    return [
      'CLUB_VIEW_MEMBERS',
      'CLUB_VIEW_REGISTRATIONS',
      'CLUB_VIEW_ANALYTICS',
    ];
  }
  if (role === 'CLUB_MENTOR')
    return [
      'CLUB_VIEW_MEMBERS',
      'CLUB_VIEW_REGISTRATIONS',
      'CLUB_VIEW_ANALYTICS',
    ];
  if (role === 'ORGANIZER') return [];
  return ['CLUB_VIEW_MEMBERS'];
}

const allowedTransitions: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PUBLISHED', 'CANCELLED', 'POSTPONED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED', 'POSTPONED'],
  REGISTRATION_OPEN: [
    'REGISTRATION_CLOSED',
    'ONGOING',
    'CANCELLED',
    'POSTPONED',
  ],
  REGISTRATION_CLOSED: ['ONGOING', 'CANCELLED', 'POSTPONED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: ['DRAFT'],
  CANCELLED: [],
  POSTPONED: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'],
};

export function canTransitionEvent(
  from: EventStatus,
  to: EventStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function canManageEvents(roles: MembershipRole[]): boolean {
  return roles.some((role) =>
    [
      'CLUB_ADMIN',
      'DEPARTMENT_ADMIN',
      'COLLEGE_ADMIN',
      'PLATFORM_ADMIN',
    ].includes(role),
  );
}

export function isRegistrationAvailable(
  event: CampusEvent,
  now = new Date(),
): boolean {
  if (!['PUBLISHED', 'REGISTRATION_OPEN'].includes(event.status)) return false;
  if (event.registrationOpensAt && now < new Date(event.registrationOpensAt))
    return false;
  if (event.registrationClosesAt && now > new Date(event.registrationClosesAt))
    return false;
  if (event.capacity !== null && event.registeredCount >= event.capacity)
    return false;
  return now < new Date(event.startsAt);
}
