export type EventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
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
export type ClubRecruitmentStatus = 'OPEN' | 'PAUSED' | 'CLOSED';
export type ClubVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';
export type ClubMembershipRole =
  | 'MEMBER'
  | 'LEAD'
  | 'SECRETARY'
  | 'PRESIDENT'
  | 'ADMIN';
export type ClubMembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';
export type NotificationType =
  | 'SYSTEM'
  | 'COLLEGE'
  | 'CLUB'
  | 'EVENT'
  | 'REGISTRATION';

export interface CollegeSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  status?: CollegeStatus;
}

export interface CollegeDetails extends CollegeSummary {
  officialEmailDomain: string | null;
  website: string | null;
  coverUrl: string | null;
  description: string | null;
  address: string | null;
  country: string;
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

export interface Department {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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
  departmentId: string | null;
  title: string;
  slug: string;
  description: string;
  eventType: string;
  venue: string;
  onlineMeetingUrl: string | null;
  imageUrl: string | null;
  posterUrl: string | null;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  feeAmount: string | null;
  currency: string;
  registeredCount: number;
  status: EventStatus;
  isRegistered?: boolean;
}

export interface CampusClub {
  id: string;
  collegeId: string;
  departmentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  coverUrl: string | null;
  recruitmentStatus: ClubRecruitmentStatus;
  verificationStatus: ClubVerificationStatus;
  upcomingEventCount: number;
  memberCount?: number;
}

export interface CampusClubDetails extends CampusClub {
  upcomingEvents: CampusEvent[];
}

export interface EventRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  registrationCode: string;
  qrToken: string;
  registeredAt: string;
  cancelledAt: string | null;
  checkedInAt: string | null;
  event: CampusEvent;
}

export interface DashboardSummary {
  upcomingEvents: number;
  activeClubs: number;
  registrations: number;
  unreadNotifications: number;
}

export interface CampusNotification {
  id: string;
  collegeId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
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
