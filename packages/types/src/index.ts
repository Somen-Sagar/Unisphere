export type EventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type MembershipRole =
  | 'STUDENT'
  | 'FACULTY'
  | 'CLUB_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'COLLEGE_ADMIN'
  | 'PLATFORM_ADMIN';

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type RegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
export type CollegeStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface CollegeSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  status?: CollegeStatus;
}

export interface Membership {
  id: string;
  collegeId: string;
  role: MembershipRole;
  status: MembershipStatus;
  studentId: string | null;
  college: CollegeSummary;
}

export interface CampusUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  memberships: Membership[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: CampusUser;
  tokens: AuthTokens;
}

export interface CampusEvent {
  id: string;
  collegeId: string;
  clubId: string | null;
  title: string;
  description: string;
  venue: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  registeredCount: number;
  status: EventStatus;
  isRegistered?: boolean;
}

export interface CampusClub {
  id: string;
  collegeId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  upcomingEventCount: number;
}

export interface CampusClubDetails extends CampusClub {
  upcomingEvents: CampusEvent[];
}

export interface EventRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  qrToken: string;
  checkedInAt: string | null;
  event: CampusEvent;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
